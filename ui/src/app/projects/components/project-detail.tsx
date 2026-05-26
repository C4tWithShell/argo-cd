import * as React from 'react';
import {RouteComponentProps} from 'react-router';
import {DataLoader, Page} from '../../shared/components';
import * as models from '../../shared/models';
import {services} from '../../shared/services';
import {ProjectAppList, ProjectAppListView, ViewToggle} from './project-app-list';
import {appSetsInProject, appsInProject, standaloneApps} from './projects-utils';

// ProjectDetail lists the ApplicationSets and standalone Applications that
// belong to a single project. Selecting an ApplicationSet drills into its
// generated Applications; selecting an Application opens its details page.
export const ProjectDetail = (props: RouteComponentProps<{name: string}>) => {
    const projectName = props.match.params.name;
    const [view, setView] = React.useState<ProjectAppListView>('tiles');

    return (
        <Page
            title={projectName}
            toolbar={{
                breadcrumbs: [{title: 'Projects', path: '/projects'}, {title: projectName}],
                tools: <ViewToggle view={view} onChange={setView} />
            }}>
            <div className='argo-container'>
                <DataLoader key={projectName} load={() => Promise.all([services.applications.list([], 'application'), services.applications.list([], 'applicationset')])}>
                    {([appList, appSetList]) => {
                        const apps = (appList.items || []) as models.Application[];
                        const appSets = (appSetList.items || []) as models.ApplicationSet[];
                        const projectAppSets = appSetsInProject(apps, appSets, projectName);
                        const projectStandaloneApps = standaloneApps(appsInProject(apps, projectName), appSets);
                        const items: models.AbstractApplication[] = [...projectAppSets, ...projectStandaloneApps];
                        return (
                            <ProjectAppList
                                applications={items}
                                view={view}
                                emptyTitle='This project has no ApplicationSets or Applications'
                                getAppSetUrl={appSet => `/projects/${projectName}/appsets/${appSet.metadata.name}`}
                            />
                        );
                    }}
                </DataLoader>
            </div>
        </Page>
    );
};
