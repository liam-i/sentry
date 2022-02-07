import styled from '@emotion/styled';

import {HeaderTitleLegend} from 'sentry/components/charts/styles';
import QuestionTooltip from 'sentry/components/questionTooltip';
import TextOverflow from 'sentry/components/textOverflow';
import space from 'sentry/styles/space';
import {MEPSPill} from 'sentry/views/performance/metricsSwitch';

import {
  GenericPerformanceWidgetProps,
  WidgetDataConstraint,
  WidgetDataProps,
} from '../types';

export function WidgetHeader<T extends WidgetDataConstraint>(
  props: GenericPerformanceWidgetProps<T> & WidgetDataProps<T>
) {
  const {title, titleTooltip, Subtitle, HeaderActions} = props;
  return (
    <WidgetHeaderContainer>
      <TitleContainer>
        <StyledHeaderTitleLegend data-test-id="performance-widget-title">
          <TextOverflow>{title}</TextOverflow>
          <QuestionTooltip position="top" size="sm" title={titleTooltip} />
          <MEPSPill />
        </StyledHeaderTitleLegend>
        <SubtitleContainer>{Subtitle ? <Subtitle {...props} /> : null}</SubtitleContainer>
      </TitleContainer>
      <HeaderActionsContainer>
        {HeaderActions && <HeaderActions {...props} />}
      </HeaderActionsContainer>
    </WidgetHeaderContainer>
  );
}

const StyledHeaderTitleLegend = styled(HeaderTitleLegend)`
  position: relative;
  z-index: initial;
`;

const TitleContainer = styled('div')`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

const SubtitleContainer = styled('div')`
  display: flex;
  flex-direction: row;
  gap: ${space(1)};
`;

const WidgetHeaderContainer = styled('div')`
  display: flex;
  justify-content: space-between;
  gap: ${space(1)};
`;

const HeaderActionsContainer = styled('div')`
  display: flex;
  gap: ${space(1)};
`;
