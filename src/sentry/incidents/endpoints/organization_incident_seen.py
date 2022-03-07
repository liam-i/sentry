from rest_framework.request import Request
from rest_framework.response import Response

from sentry.api.bases.incident import IncidentEndpoint, IncidentPermission
from sentry.incidents.logic import set_incident_seen
from sentry.incidents.models import Incident
from sentry.models import Organization


class OrganizationIncidentSeenEndpoint(IncidentEndpoint):
    permission_classes = (IncidentPermission,)

    def post(self, request: Request, organization: Organization, incident: Incident) -> Response:
        """
        Mark an incident as seen by the user
        ````````````````````````````````````

        :auth: required
        """

        set_incident_seen(incident=incident, user=request.user)
        return Response({}, status=201)
