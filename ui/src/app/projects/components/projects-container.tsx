import * as React from 'react';
import {Route, RouteComponentProps, Switch} from 'react-router';
import {AppSetDetail} from './appset-detail';
import {ProjectDetail} from './project-detail';
import {ProjectsList} from './projects-list';

export const ProjectsContainer = (props: RouteComponentProps<any>) => (
    <Switch>
        <Route exact={true} path={`${props.match.path}`} component={ProjectsList} />
        <Route exact={true} path={`${props.match.path}/:name`} component={ProjectDetail} />
        <Route exact={true} path={`${props.match.path}/:name/appsets/:appset`} component={AppSetDetail} />
    </Switch>
);
