import * as React from 'react';
import {Tooltip} from 'argo-ui';
import {DataLoader, EmptyState, Page} from '../../../shared/components';
import {Context} from '../../../shared/context';
import * as models from '../../../shared/models';
import {services} from '../../../shared/services';

require('./projects-landing.scss');

interface ProjectWithCounts {
    project: models.Project;
    appCount: number;
    appSetCount: number;
}

export const ProjectsLanding = () => {
    const ctx = React.useContext(Context);

    return (
        <Page title='Projects' toolbar={{breadcrumbs: [{title: 'Projects'}]}}>
            <div className='projects-landing'>
                <div className='projects-landing__header'>
                    <span className='projects-landing__header__text'>Select a project to browse its ApplicationSets and Applications</span>
                    <a className='argo-button argo-button--base-o' onClick={() => ctx.navigation.goto('/applications')}>
                        <i className='fa fa-list' /> View All Applications
                    </a>
                </div>
                <DataLoader
                    load={async () => {
                        const [projects, apps, appSets] = await Promise.all([
                            services.projects.list(),
                            services.applications.list([], 'application', {
                                fields: ['items.metadata.name', 'items.spec', 'items.status.health']
                            }),
                            services.applications.list([], 'applicationset', {
                                fields: ['items.metadata.name', 'items.metadata.namespace', 'items.spec', 'items.status.health']
                            })
                        ]);

                        const appCountByProject: {[key: string]: number} = {};
                        const appSetCountByProject: {[key: string]: number} = {};

                        (appSets.items || []).forEach((appSet: models.AbstractApplication) => {
                            const project: string = (appSet as any).spec?.template?.spec?.project || 'default';
                            appSetCountByProject[project] = (appSetCountByProject[project] || 0) + 1;
                        });

                        (apps.items || []).forEach((app: models.AbstractApplication) => {
                            const project: string = (app as models.Application).spec?.project || 'default';
                            appCountByProject[project] = (appCountByProject[project] || 0) + 1;
                        });

                        return projects.map(proj => ({
                            project: proj,
                            appCount: appCountByProject[proj.metadata.name || ''] || 0,
                            appSetCount: appSetCountByProject[proj.metadata.name || ''] || 0
                        })) as ProjectWithCounts[];
                    }}>
                    {(projectsWithCounts: ProjectWithCounts[]) =>
                        projectsWithCounts.length > 0 ? (
                            <div className='projects-landing__grid'>
                                {projectsWithCounts.map(({project, appCount, appSetCount}) => (
                                    <div
                                        key={project.metadata.name}
                                        className='projects-landing__card argo-table-list__row'
                                        onClick={() => ctx.navigation.goto(`/projects/${project.metadata.name}`)}>
                                        <div className='projects-landing__card__header'>
                                            <i className='fa fa-object-group' />
                                            <Tooltip content={project.metadata.name || ''}>
                                                <span className='projects-landing__card__title'>{project.metadata.name}</span>
                                            </Tooltip>
                                        </div>
                                        {project.spec.description && <div className='projects-landing__card__description'>{project.spec.description}</div>}
                                        <div className='projects-landing__card__counts'>
                                            <div className='projects-landing__card__count'>
                                                <i className='fa fa-cubes' />
                                                <span>
                                                    {appSetCount} AppSet{appSetCount !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                            <div className='projects-landing__card__count'>
                                                <i className='argo-icon argo-icon-application' />
                                                <span>
                                                    {appCount} App{appCount !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <EmptyState icon='fa fa-object-group'>
                                <h4>No projects yet</h4>
                                <h5>Create new projects in Settings to group your applications</h5>
                            </EmptyState>
                        )
                    }
                </DataLoader>
            </div>
        </Page>
    );
};
