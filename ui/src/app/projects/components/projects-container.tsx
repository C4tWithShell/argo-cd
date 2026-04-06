import * as React from 'react';
import {Route, RouteComponentProps, Switch} from 'react-router';
import {ProjectsLanding} from './projects-landing/projects-landing';
import {ProjectDetail} from './project-detail/project-detail';

export const ProjectsContainer = (props: RouteComponentProps<any>) => (
    <Switch>
        <Route exact={true} path={`${props.match.path}`} component={ProjectsLanding} />
        <Route exact={true} path={`${props.match.path}/:projectName`} component={ProjectDetail} />
    </Switch>
);
