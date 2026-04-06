import * as React from 'react';
import {RouteComponentProps} from 'react-router';
import {Tooltip} from 'argo-ui';
import {DataLoader, EmptyState, Page} from '../../../shared/components';
import {Context} from '../../../shared/context';
import * as models from '../../../shared/models';
import {services} from '../../../shared/services';

require('./project-detail.scss');

interface AppGroup {
    appSet: models.AbstractApplication;
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
                            services.applications.list([projectName], 'application', {
                                fields: [
                                    'items.metadata.name',
                                    'items.metadata.namespace',
                                    'items.metadata.ownerReferences',
                                    'items.spec.project',
                                    'items.spec.destination',
                                    'items.spec.source',
                                    'items.spec.sources',
                                    'items.status.health',
                                    'items.status.sync.status',
                                    'items.status.operationState.phase',
                                    'items.status.summary'
                                ]
                            }),
                            services.applications.list([], 'applicationset', {
                                fields: [
                                    'items.metadata.name',
                                    'items.metadata.namespace',
                                    'items.spec',
                                    'items.status.conditions',
                                    'items.status.health',
                                    'items.status.resourcesCount'
                                ]
                            })
                        ]);

                        // Filter appsets by project (client-side since API doesn't support project filter for appsets)
                        const projectAppSets = (appSets.items || []).filter((appSet: models.AbstractApplication) => {
                            const appSetProject = appSet.spec?.template?.spec?.project || 'default';
                            return appSetProject === projectName;
                        });

                        // Group apps: those owned by an AppSet vs standalone
                        const appSetMap = new Map<string, models.AbstractApplication>();
                        projectAppSets.forEach((appSet: models.AbstractApplication) => {
                            appSetMap.set(appSet.metadata.name || '', appSet);
                        });

                        const standaloneApps: models.Application[] = [];
                        const appsByAppSet = new Map<string, models.Application[]>();

                        ((apps.items || []) as models.Application[]).forEach((app: models.Application) => {
                            const ownerRef = (app.metadata as any)?.ownerReferences?.find((ref: any) => ref.kind === 'ApplicationSet');
                            if (ownerRef && appSetMap.has(ownerRef.name)) {
                                const existing = appsByAppSet.get(ownerRef.name) || [];
                                existing.push(app);
                                appsByAppSet.set(ownerRef.name, existing);
                            } else {
                                standaloneApps.push(app);
                            }
                        });

                        // Build groups: AppSets with their apps
                        const groups: AppGroup[] = [];
                        projectAppSets.forEach((appSet: models.AbstractApplication) => {
                            groups.push({
                                appSet,
                                apps: appsByAppSet.get(appSet.metadata.name || '') || []
                            });
                        });

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
    const healthStatus = appSet.status?.health?.status || 'Unknown';

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
