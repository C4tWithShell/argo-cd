import * as React from 'react';
import {DataLoader, EmptyState, Page} from '../../shared/components';
import {Consumer} from '../../shared/context';
import * as models from '../../shared/models';
import {services} from '../../shared/services';
import {appSetsInProject, appsInProject} from './projects-utils';

// ProjectsList shows every AppProject. Selecting one opens its detail page,
// which lists the ApplicationSets and Applications that belong to it.
export const ProjectsList = () => (
    <Consumer>
        {ctx => (
            <Page title='Projects' toolbar={{breadcrumbs: [{title: 'Projects', path: '/projects'}]}}>
                <div className='argo-container'>
                    <DataLoader
                        load={() => Promise.all([services.projects.list(), services.applications.list([], 'application'), services.applications.list([], 'applicationset')])}>
                        {([projects, appList, appSetList]) => {
                            const apps = (appList.items || []) as models.Application[];
                            const appSets = (appSetList.items || []) as models.ApplicationSet[];
                            return (
                                (projects.length > 0 && (
                                    <div className='argo-table-list argo-table-list--clickable'>
                                        <div className='argo-table-list__head'>
                                            <div className='row'>
                                                <div className='columns small-3'>NAME</div>
                                                <div className='columns small-5'>DESCRIPTION</div>
                                                <div className='columns small-2'>APPLICATIONS</div>
                                                <div className='columns small-2'>APPLICATIONSETS</div>
                                            </div>
                                        </div>
                                        {projects.map(proj => (
                                            <div className='argo-table-list__row' key={proj.metadata.name} onClick={() => ctx.navigation.goto(`/projects/${proj.metadata.name}`)}>
                                                <div className='row'>
                                                    <div className='columns small-3'>
                                                        <i className='fa fa-object-group' /> {proj.metadata.name}
                                                    </div>
                                                    <div className='columns small-5'>{proj.spec.description}</div>
                                                    <div className='columns small-2'>{appsInProject(apps, proj.metadata.name).length}</div>
                                                    <div className='columns small-2'>{appSetsInProject(apps, appSets, proj.metadata.name).length}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )) || (
                                    <EmptyState icon='fa fa-object-group'>
                                        <h4>No projects yet</h4>
                                        <h5>Projects can be created from the Settings page</h5>
                                    </EmptyState>
                                )
                            );
                        }}
                    </DataLoader>
                </div>
            </Page>
        )}
    </Consumer>
);
