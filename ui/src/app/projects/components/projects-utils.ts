import * as models from '../../shared/models';

// getAppSetGeneratedAppNames returns the Application names that an ApplicationSet
// claims to manage, derived from its status. This is the authoritative signal:
// the alternative (Application.metadata.ownerReferences) is unreliable because
// the Application list API's field allowlist strips ownerReferences from
// responses (see pkg/apiclient/application/forwarder_overwrite.go appFields).
export function getAppSetGeneratedAppNames(appSet: models.ApplicationSet): Set<string> {
    const names = new Set<string>();
    (appSet.status?.resources || []).forEach(r => {
        if (r?.name) {
            names.add(r.name);
        }
    });
    (appSet.status?.applicationStatus || []).forEach(s => {
        if (s?.application) {
            names.add(s.application);
        }
    });
    return names;
}
