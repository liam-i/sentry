import * as React from 'react';
import {withRouter, WithRouterProps} from 'react-router';
import styled from '@emotion/styled';

import AreaChart from 'sentry/components/charts/areaChart';
import ChartZoom from 'sentry/components/charts/chartZoom';
import {HeaderTitleLegend, SectionHeading} from 'sentry/components/charts/styles';
import type {DateTimeObject} from 'sentry/components/charts/utils';
import {Panel, PanelBody, PanelFooter} from 'sentry/components/panels';
import Placeholder from 'sentry/components/placeholder';
import {t} from 'sentry/locale';
import space from 'sentry/styles/space';
import {Organization, Project} from 'sentry/types';
import {IssueAlertRule, ProjectAlertRuleStats} from 'sentry/types/alerts';
import getDynamicText from 'sentry/utils/getDynamicText';

type Props = DateTimeObject &
  WithRouterProps & {
    loading: boolean;
    orgId: string;
    organization: Organization;
    project: Project;
    rule: IssueAlertRule;
    ruleFireHistory: ProjectAlertRuleStats[];
  };

const AlertChart = ({
  router,
  period,
  start,
  end,
  utc,
  ruleFireHistory,
  loading,
}: Props) => {
  const renderChart = () => {
    const series = {
      seriesName: 'Alerts Triggered',
      data: ruleFireHistory.map(alert => ({
        name: alert.date,
        value: alert.count,
      })),
      emphasis: {
        disabled: true,
      },
    };

    return (
      <ChartZoom
        router={router}
        period={period}
        start={start}
        end={end}
        utc={utc}
        usePageDate
      >
        {zoomRenderProps => (
          <AreaChart
            {...zoomRenderProps}
            isGroupedByDate
            showTimeInTooltip
            grid={{
              left: space(0.25),
              right: space(2),
              top: space(3),
              bottom: 0,
            }}
            yAxis={{
              minInterval: 1,
            }}
            series={[series]}
          />
        )}
      </ChartZoom>
    );
  };

  const renderEmpty = () => {
    return (
      <Panel>
        <PanelBody withPadding>
          <Placeholder height="200px" />
        </PanelBody>
      </Panel>
    );
  };

  const totalAlertsTriggered = ruleFireHistory.reduce((acc, curr) => acc + curr.count, 0);

  return loading ? (
    renderEmpty()
  ) : (
    <Panel>
      <StyledPanelBody withPadding>
        <ChartHeader>
          <HeaderTitleLegend>{t('Alerts Triggered')}</HeaderTitleLegend>
        </ChartHeader>
        {getDynamicText({
          value: renderChart(),
          fixed: <Placeholder height="200px" testId="skeleton-ui" />,
        })}
      </StyledPanelBody>
      <ChartFooter>
        <FooterHeader>{t('Alerts Triggered')}</FooterHeader>
        <FooterValue>{totalAlertsTriggered}</FooterValue>
      </ChartFooter>
    </Panel>
  );
};

export default withRouter(AlertChart);

const ChartHeader = styled('div')`
  margin-bottom: ${space(3)};
`;

const ChartFooter = styled(PanelFooter)`
  display: flex;
  align-items: center;
  padding: ${space(1)} 20px;
`;

const FooterHeader = styled(SectionHeading)`
  display: flex;
  align-items: center;
  margin: 0;
  font-weight: bold;
  font-size: ${p => p.theme.fontSizeSmall};
  line-height: 1;
`;

const FooterValue = styled('div')`
  display: flex;
  align-items: center;
  margin: 0 ${space(1)};
`;

/* Override padding to make chart appear centered */
const StyledPanelBody = styled(PanelBody)`
  padding-right: 6px;
`;
