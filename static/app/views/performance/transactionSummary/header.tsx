import * as React from 'react';
import styled from '@emotion/styled';
import {Location} from 'history';

import Feature from 'app/components/acl/feature';
import {GuideAnchor} from 'app/components/assistant/guideAnchor';
import Button from 'app/components/button';
import ButtonBar from 'app/components/buttonBar';
import {CreateAlertFromViewButton} from 'app/components/createAlertButton';
import FeatureBadge from 'app/components/featureBadge';
import * as Layout from 'app/components/layouts/thirds';
import ListLink from 'app/components/links/listLink';
import NavTabs from 'app/components/navTabs';
import {IconSettings} from 'app/icons';
import {t} from 'app/locale';
import {Organization, Project} from 'app/types';
import {trackAnalyticsEvent} from 'app/utils/analytics';
import EventView from 'app/utils/discover/eventView';
import HasMeasurementsQuery from 'app/utils/performance/vitals/hasMeasurementsQuery';
import {decodeScalar} from 'app/utils/queryString';
import Breadcrumb from 'app/views/performance/breadcrumb';

import {getCurrentLandingDisplay, LandingDisplayField} from '../landing/utils';

import {eventsRouteWithQuery} from './transactionEvents/utils';
import {tagsRouteWithQuery} from './transactionTags/utils';
import {vitalsRouteWithQuery} from './transactionVitals/utils';
import TeamKeyTransactionButton from './teamKeyTransactionButton';
import TransactionThresholdButton from './transactionThresholdButton';
import {TransactionThresholdMetric} from './transactionThresholdModal';
import {transactionSummaryRouteWithQuery} from './utils';

export enum Tab {
  TransactionSummary,
  RealUserMonitoring,
  Tags,
  Events,
}

type Props = {
  eventView: EventView;
  location: Location;
  organization: Organization;
  projects: Project[];
  transactionName: string;
  currentTab: Tab;
  hasWebVitals: 'maybe' | 'yes' | 'no';
  onChangeThreshold?: (threshold: number, metric: TransactionThresholdMetric) => void;
  handleIncompatibleQuery: React.ComponentProps<
    typeof CreateAlertFromViewButton
  >['onIncompatibleQuery'];
};

class TransactionHeader extends React.Component<Props> {
  trackAlertClick(errors?: Record<string, boolean>) {
    const {organization} = this.props;
    trackAnalyticsEvent({
      eventKey: 'performance_views.summary.create_alert_clicked',
      eventName: 'Performance Views: Create alert clicked',
      organization_id: organization.id,
      status: errors ? 'error' : 'success',
      errors,
      url: window.location.href,
    });
  }

  trackTabClick =
    ({eventKey, eventName}: {eventKey: string; eventName: string}) =>
    () => {
      const {organization} = this.props;
      trackAnalyticsEvent({
        eventKey,
        eventName,
        organization_id: organization.id,
      });
    };

  handleIncompatibleQuery: React.ComponentProps<
    typeof CreateAlertFromViewButton
  >['onIncompatibleQuery'] = (incompatibleAlertNoticeFn, errors) => {
    this.trackAlertClick(errors);
    this.props.handleIncompatibleQuery?.(incompatibleAlertNoticeFn, errors);
  };

  handleCreateAlertSuccess = () => {
    this.trackAlertClick();
  };

  renderCreateAlertButton() {
    const {eventView, organization, projects} = this.props;

    return (
      <CreateAlertFromViewButton
        eventView={eventView}
        organization={organization}
        projects={projects}
        onIncompatibleQuery={this.handleIncompatibleQuery}
        onSuccess={this.handleCreateAlertSuccess}
        referrer="performance"
      />
    );
  }

  renderKeyTransactionButton() {
    const {eventView, organization, transactionName} = this.props;

    return (
      <TeamKeyTransactionButton
        transactionName={transactionName}
        eventView={eventView}
        organization={organization}
      />
    );
  }

  renderSettingsButton() {
    const {organization, transactionName, eventView, onChangeThreshold} = this.props;

    return (
      <Feature
        organization={organization}
        features={['project-transaction-threshold-override']}
      >
        {({hasFeature}) =>
          hasFeature ? (
            <GuideAnchor
              target="project_transaction_threshold_override"
              position="bottom"
            >
              <TransactionThresholdButton
                organization={organization}
                transactionName={transactionName}
                eventView={eventView}
                onChangeThreshold={onChangeThreshold}
              />
            </GuideAnchor>
          ) : (
            <Button
              href={`/settings/${organization.slug}/performance/`}
              icon={<IconSettings />}
              aria-label={t('Settings')}
            />
          )
        }
      </Feature>
    );
  }

  renderWebVitalsTab() {
    const {
      organization,
      eventView,
      location,
      projects,
      transactionName,
      currentTab,
      hasWebVitals,
    } = this.props;

    const vitalsTarget = vitalsRouteWithQuery({
      orgSlug: organization.slug,
      transaction: transactionName,
      projectID: decodeScalar(location.query.project),
      query: location.query,
    });

    const tab = (
      <ListLink
        data-test-id="web-vitals-tab"
        to={vitalsTarget}
        isActive={() => currentTab === Tab.RealUserMonitoring}
        onClick={this.trackTabClick({
          eventKey: 'performance_views.vitals.vitals_tab_clicked',
          eventName: 'Performance Views: Vitals tab clicked',
        })}
      >
        {t('Web Vitals')}
      </ListLink>
    );

    switch (hasWebVitals) {
      case 'maybe':
        // need to check if the web vitals tab should be shown

        // frontend projects should always show the web vitals tab
        if (
          getCurrentLandingDisplay(location, projects, eventView).field ===
          LandingDisplayField.FRONTEND_PAGELOAD
        ) {
          return tab;
        }

        // if it is not a frontend project, then we check to see if there
        // are any web vitals associated with the transaction recently
        return (
          <HasMeasurementsQuery
            location={location}
            orgSlug={organization.slug}
            eventView={eventView}
            transaction={transactionName}
            type="web"
          >
            {({hasMeasurements}) => (hasMeasurements ? tab : null)}
          </HasMeasurementsQuery>
        );
      case 'yes':
        // always show the web vitals tab
        return tab;
      case 'no':
      default:
        // never show the web vitals tab
        return null;
    }
  }

  render() {
    const {organization, location, transactionName, currentTab} = this.props;

    const summaryTarget = transactionSummaryRouteWithQuery({
      orgSlug: organization.slug,
      transaction: transactionName,
      projectID: decodeScalar(location.query.project),
      query: location.query,
    });

    const tagsTarget = tagsRouteWithQuery({
      orgSlug: organization.slug,
      transaction: transactionName,
      projectID: decodeScalar(location.query.project),
      query: location.query,
    });

    const eventsTarget = eventsRouteWithQuery({
      orgSlug: organization.slug,
      transaction: transactionName,
      projectID: decodeScalar(location.query.project),
      query: location.query,
    });

    return (
      <Layout.Header>
        <Layout.HeaderContent>
          <Breadcrumb
            organization={organization}
            location={location}
            transactionName={transactionName}
            realUserMonitoring={currentTab === Tab.RealUserMonitoring}
          />
          <Layout.Title>{transactionName}</Layout.Title>
        </Layout.HeaderContent>
        <Layout.HeaderActions>
          <ButtonBar gap={1}>
            <Feature organization={organization} features={['incidents']}>
              {({hasFeature}) => hasFeature && this.renderCreateAlertButton()}
            </Feature>
            {this.renderKeyTransactionButton()}
            {this.renderSettingsButton()}
          </ButtonBar>
        </Layout.HeaderActions>
        <React.Fragment>
          <StyledNavTabs>
            <ListLink
              to={summaryTarget}
              isActive={() => currentTab === Tab.TransactionSummary}
            >
              {t('Overview')}
            </ListLink>
            {this.renderWebVitalsTab()}
            <Feature features={['organizations:performance-tag-page']}>
              <ListLink
                to={tagsTarget}
                isActive={() => currentTab === Tab.Tags}
                onClick={this.trackTabClick({
                  eventKey: 'performance_views.tags.tags_tab_clicked',
                  eventName: 'Performance Views: Tags tab clicked',
                })}
              >
                {t('Tags')}
                <FeatureBadge type="new" noTooltip />
              </ListLink>
            </Feature>
            <Feature features={['organizations:performance-events-page']}>
              <ListLink
                to={eventsTarget}
                isActive={() => currentTab === Tab.Events}
                onClick={this.trackTabClick({
                  eventKey: 'performance_views.events.events_tab_clicked',
                  eventName: 'Performance Views: Events tab clicked',
                })}
              >
                {t('All Events')}
              </ListLink>
            </Feature>
          </StyledNavTabs>
        </React.Fragment>
      </Layout.Header>
    );
  }
}

const StyledNavTabs = styled(NavTabs)`
  margin-bottom: 0;
  /* Makes sure the tabs are pushed into another row */
  width: 100%;
`;

export default TransactionHeader;
