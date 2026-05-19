import {KeybindingProvider} from 'argo-ui/v2';
import * as React from 'react';
import {ApplicationsTable} from '../../applications/components/applications-list/applications-table';
import {ApplicationTiles} from '../../applications/components/applications-list/applications-tiles';
import * as AppUtils from '../../applications/components/utils';
import {EmptyState} from '../../shared/components';
import {Consumer} from '../../shared/context';
import * as models from '../../shared/models';
import {services} from '../../shared/services';

export type ProjectAppListView = 'tiles' | 'list';

interface ProjectAppListProps {
    applications: models.AbstractApplication[];
    view: ProjectAppListView;
    // getAppSetUrl optionally overrides where an ApplicationSet tile/row navigates on click.
    getAppSetUrl?: (appSet: models.ApplicationSet) => string;
    emptyTitle: string;
}

// ProjectAppList renders a mixed list of ApplicationSets and Applications by
// reusing the same tile/table components as the main Applications page.
export const ProjectAppList = ({applications, view, getAppSetUrl, emptyTitle}: ProjectAppListProps) => {
    if (applications.length === 0) {
        return (
            <EmptyState icon='argo-icon-application'>
                <h4>{emptyTitle}</h4>
            </EmptyState>
        );
    }

    return (
        <Consumer>
            {ctx => {
                const refreshApplication = (name: string, namespace: string) => services.applications.get(name, namespace, 'application', 'normal');
                const deleteApplication = (name: string, namespace: string) => AppUtils.deleteApplication(name, namespace, ctx);
                return (
                    <KeybindingProvider>
                        {view === 'tiles' ? (
                            <ApplicationTiles
                                applications={applications}
                                syncApplication={() => ({})}
                                refreshApplication={refreshApplication}
                                deleteApplication={deleteApplication}
                                getAppSetUrl={getAppSetUrl}
                            />
                        ) : (
                            <ApplicationsTable
                                applications={applications}
                                syncApplication={() => ({})}
                                refreshApplication={refreshApplication}
                                deleteApplication={deleteApplication}
                                getAppSetUrl={getAppSetUrl}
                            />
                        )}
                    </KeybindingProvider>
                );
            }}
        </Consumer>
    );
};

interface ViewToggleProps {
    view: ProjectAppListView;
    onChange: (view: ProjectAppListView) => void;
}

// ViewToggle is a small tiles/list switch intended for a Page toolbar's `tools` slot.
export const ViewToggle = ({view, onChange}: ViewToggleProps) => (
    <div className='applications-list__view-type' style={{display: 'inline-block'}}>
        <i className={`fa fa-th${view === 'tiles' ? ' selected' : ''}`} title='Tiles' style={{cursor: 'pointer', padding: '0 4px'}} onClick={() => onChange('tiles')} />
        <i className={`fa fa-th-list${view === 'list' ? ' selected' : ''}`} title='List' style={{cursor: 'pointer', padding: '0 4px'}} onClick={() => onChange('list')} />
    </div>
);
