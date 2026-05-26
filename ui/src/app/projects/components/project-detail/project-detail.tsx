import * as React from 'react';
import {RouteComponentProps} from 'react-router';
import {Tooltip} from 'argo-ui';
import {DataLoader, EmptyState, Page} from '../../../shared/components';
import {Context} from '../../../shared/context';
import * as models from '../../../shared/models';
import {services} from '../../../shared/services';
import {getAppSetHealthStatus} from '../../../applications/components/utils';
import {getAppSetGeneratedAppNames} from '../projects-utils';

require('./project-detail.scss');

interface AppGroup {
    appSet: models.ApplicationSet;
    apps: models.Application[];
}

function getHealthColor(status: string): string {
    switch (status) {
        case 'Healthy':
            return 'health-healthy';
        case 'Progressing':
            return 'health-progressing';
        case 'Degraded':
            return 'health-degraded';
        case 'Suspended':
            return 'health-suspended';
        case 'Missing':
            return 'health-missing';
        default:
            return 'health-unknown';
    }
}

function getSyncColor(status: string): string {
    switch (status) {
        case 'Synced':
            return 'sync-synced';
        case 'OutOfSync':
            return 'sync-outofsync';
        default:
            return 'sync-unknown';
    }
}

function getHealthIcon(status: string): string {
    switch (status) {
        case 'Healthy':
            return 'fa fa-heart';
        case 'Progressing':
            return 'fa fa-circle-notch fa-spin';
        case 'Degraded':
            return 'fa fa-heart-broken';
        case 'Suspended':
            return 'fa fa-pause-circle';
        case 'Missing':
            return 'fa fa-ghost';
        default:
            return 'fa fa-question-circle';
    }
}

function getSyncIcon(status: string): string {
    switch (status) {
        case 'Synced':
            return 'fa fa-check-circle';
        case 'OutOfSync':
            return 'fa fa-arrow-alt-circle-up';
        default:
            return 'fa fa-question-circle';
    }
}

export const ProjectDetail = (props: RouteComponentProps<{projectName: string}>) => {
    const ctx = React.useContext(Context);
    const projectName = props.match.params.projectName;

    return (
        <Page
            title={`Project: ${projectName}`}
            toolbar={{
                breadcrumbs: [{title: 'Projects', path: '/projects'}, {title: projectName}],
                actionMenu: {
                    items: [
                        {
                            title: 'View All Apps (flat)',
                            iconClassName: 'fa fa-list',
                            action: () => ctx.navigation.goto(`/applications?proj=${projectName}`)
                        }
                    ]
                }
            }}>
            <div className='project-detail'>
                <DataLoader
                    load={async () => {
                        const [apps, appSets] = await Promise.all([
                            // Intentionally omit `fields` for the application list:
                            // the server-side field allowlist
                            // (pkg/apiclient/application/forwarder_overwrite.go appFields)
                            // does not include `metadata.ownerReferences`, so requesting
                            // it via `fields=` would silently drop it. Omitting fields
                            // returns the full Application objects and preserves
                            // ownerReferences, which is how the AppSet controller links
                            // generated Apps back to their AppSet.
                            services.applications.list([projectName], 'application'),
                            services.applications.list([], 'applicationset', {
                                fields: [
                                    'items.metadata.name',
                                    'items.metadata.namespace',
                                    'items.spec',
                                    'items.status.conditions',
                                    'items.status.health',
                                    'items.status.resources',
                                    'items.status.applicationStatus',
                                    'items.status.resourcesCount'
                                ]
                            })
                        ]);

                        // Filter AppSets to this project. Use the template's project
                        // (works for non-parameterized projects) and fall back to the
                        // projects of the apps the AppSet has generated.
                        const allAppSets = (appSets.items || []) as models.ApplicationSet[];
                        const allApps = (apps.items || []) as models.Application[];
                        const appsInProject = new Set(allApps.map(a => a.metadata.name));

                        const projectAppSets = allAppSets.filter(appSet => {
                            const templateProject: string = (appSet as any).spec?.template?.spec?.project || 'default';
                            if (templateProject === projectName) {
                                return true;
                            }
                            // Fallback: AppSet is in this project if any of the apps it
                            // claims (via status.resources / status.applicationStatus)
                            // is one of the apps we just fetched for this project.
                            for (const generatedName of Array.from(getAppSetGeneratedAppNames(appSet))) {
                                if (appsInProject.has(generatedName)) {
                                    return true;
                                }
                            }
                            return false;
                        });

                        // Group apps by AppSet. Two independent signals are combined
                        // for robustness:
                        //   1. app.metadata.ownerReferences — written by the AppSet
                        //      controller; the primary signal in most clusters.
                        //   2. appSet.status.resources / status.applicationStatus —
                        //      written by the AppSet controller into its own status;
                        //      useful when ownerReferences are absent.
                        const appsByAppSet = new Map<string, models.Application[]>();
                        const appByName = new Map(allApps.map(a => [a.metadata.name || '', a]));
                        const claimedAppNames = new Set<string>();
                        const projectAppSetNames = new Set(projectAppSets.map(as => as.metadata.name || ''));

                        projectAppSets.forEach(appSet => {
                            appsByAppSet.set(appSet.metadata.name || '', []);
                        });

                        const addAppToAppSet = (appSetName: string, app: models.Application) => {
                            const list = appsByAppSet.get(appSetName);
                            if (!list || list.some(existing => existing.metadata.name === app.metadata.name)) {
                                return;
                            }
                            list.push(app);
                            claimedAppNames.add(app.metadata.name || '');
                        };

                        // Signal 1: ownerReferences on each Application.
                        allApps.forEach(app => {
                            const ownerRef = (app.metadata.ownerReferences || []).find(r => r.kind === 'ApplicationSet');
                            if (ownerRef && projectAppSetNames.has(ownerRef.name)) {
                                addAppToAppSet(ownerRef.name, app);
                            }
                        });

                        // Signal 2: the AppSet's own status records the apps it generated.
                        projectAppSets.forEach(appSet => {
                            getAppSetGeneratedAppNames(appSet).forEach(name => {
                                const app = appByName.get(name);
                                if (app) {
                                    addAppToAppSet(appSet.metadata.name || '', app);
                                }
                            });
                        });

                        const standaloneApps: models.Application[] = allApps.filter(app => !claimedAppNames.has(app.metadata.name || ''));

                        const groups: AppGroup[] = projectAppSets.map(appSet => ({
                            appSet,
                            apps: appsByAppSet.get(appSet.metadata.name || '') || []
                        }));

                        return {groups, standaloneApps};
                    }}>
                    {({groups, standaloneApps}: {groups: AppGroup[]; standaloneApps: models.Application[]}) => (
                        <div>
                            {groups.length === 0 && standaloneApps.length === 0 && (
                                <EmptyState icon='fa fa-object-group'>
                                    <h4>No ApplicationSets or Applications in this project</h4>
                                </EmptyState>
                            )}

                            {groups.length > 0 && (
                                <div className='project-detail__section'>
                                    <h4 className='project-detail__section-title'>
                                        <i className='fa fa-layer-group' /> ApplicationSets ({groups.length})
                                    </h4>
                                    {groups.map(group => (
                                        <AppSetGroup key={group.appSet.metadata.name} group={group} ctx={ctx} />
                                    ))}
                                </div>
                            )}

                            {standaloneApps.length > 0 && (
                                <div className='project-detail__section'>
                                    <h4 className='project-detail__section-title'>
                                        <i className='argo-icon argo-icon-application' /> Standalone Applications ({standaloneApps.length})
                                    </h4>
                                    <div className='project-detail__apps-grid'>
                                        {standaloneApps.map(app => (
                                            <AppCard key={app.metadata.name} app={app} ctx={ctx} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DataLoader>
            </div>
        </Page>
    );
};

const AppSetGroup = ({group, ctx}: {group: AppGroup; ctx: any}) => {
    const [expanded, setExpanded] = React.useState(true);
    const appSet = group.appSet;
    const healthStatus = getAppSetHealthStatus(appSet);

    return (
        <div className='project-detail__appset-group'>
            <div className='project-detail__appset-header' onClick={() => setExpanded(!expanded)}>
                <i className={`fa fa-chevron-${expanded ? 'down' : 'right'} project-detail__appset-header__chevron`} />
                <span className={`project-detail__health-badge project-detail__${getHealthColor(healthStatus)}`}>
                    <i className={getHealthIcon(healthStatus)} />
                </span>
                <span className='project-detail__appset-header__name'>{appSet.metadata.name}</span>
                <span className='project-detail__appset-header__count'>
                    {group.apps.length} app{group.apps.length !== 1 ? 's' : ''}
                </span>
            </div>
            {expanded && (
                <div className='project-detail__apps-grid project-detail__apps-grid--nested'>
                    {group.apps.length > 0 ? (
                        group.apps.map(app => <AppCard key={app.metadata.name} app={app} ctx={ctx} />)
                    ) : (
                        <div className='project-detail__no-apps'>No applications generated yet</div>
                    )}
                </div>
            )}
        </div>
    );
};

const AppCard = ({app, ctx}: {app: models.Application; ctx: any}) => {
    const healthStatus = app.status?.health?.status || 'Unknown';
    const syncStatus = (app.status as any)?.sync?.status || 'Unknown';

    return (
        <div
            className={`project-detail__app-card argo-table-list__row project-detail__app-card--${getHealthColor(healthStatus)}`}
            onClick={e => ctx.navigation.goto(`/applications/${app.metadata.name}`, {}, {event: e})}>
            <div className='project-detail__app-card__header'>
                <Tooltip content={app.metadata.name || ''}>
                    <span className='project-detail__app-card__name'>{app.metadata.name}</span>
                </Tooltip>
            </div>
            <div className='project-detail__app-card__status'>
                <span className={`project-detail__health-badge project-detail__${getHealthColor(healthStatus)}`}>
                    <i className={getHealthIcon(healthStatus)} /> {healthStatus}
                </span>
                <span className={`project-detail__sync-badge project-detail__${getSyncColor(syncStatus)}`}>
                    <i className={getSyncIcon(syncStatus)} /> {syncStatus}
                </span>
            </div>
            {app.spec?.destination && (
                <div className='project-detail__app-card__dest'>
                    <i className='fa fa-server' /> {app.spec.destination.namespace || '-'}
                </div>
            )}
        </div>
    );
};
