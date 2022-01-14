import * as React from 'react';

import SvgIcon, {SVGIconProps} from './svgIcon';

const IconBell = React.forwardRef<SVGSVGElement, SVGIconProps>((props, ref) => {
  return (
    <SvgIcon {...props} ref={ref}>
      <path d="M7.00012 15.9999C6.30168 15.9972 5.63275 15.7179 5.13982 15.2231C4.64688 14.7283 4.37011 14.0583 4.37012 13.3599C4.37012 13.161 4.44913 12.9702 4.58979 12.8295C4.73044 12.6889 4.9212 12.6099 5.12012 12.6099C5.31903 12.6099 5.5098 12.6889 5.65045 12.8295C5.7911 12.9702 5.87012 13.161 5.87012 13.3599C5.87012 13.6596 5.98917 13.947 6.20109 14.1589C6.413 14.3708 6.70042 14.4899 7.00012 14.4899C7.29981 14.4899 7.58723 14.3708 7.79915 14.1589C8.01106 13.947 8.13012 13.6596 8.13012 13.3599C8.13012 13.161 8.20913 12.9702 8.34979 12.8295C8.49044 12.6889 8.68121 12.6099 8.88012 12.6099C9.07903 12.6099 9.26979 12.6889 9.41045 12.8295C9.5511 12.9702 9.63012 13.161 9.63012 13.3599C9.63012 14.0583 9.35335 14.7283 8.86042 15.2231C8.36748 15.7179 7.69855 15.9972 7.00012 15.9999Z" />
      <path d="M13 14.07H1.00001C0.895161 14.0708 0.791282 14.0499 0.694908 14.0086C0.598533 13.9673 0.511748 13.9065 0.44001 13.83C0.370242 13.7536 0.317284 13.6633 0.284556 13.5652C0.251829 13.467 0.24006 13.363 0.25001 13.26L0.82001 6.71V6.65C0.757871 4.94869 1.37402 3.29235 2.53296 2.04528C3.6919 0.798201 5.29871 0.0625085 7.00001 0C8.69767 0.0574355 10.3034 0.785325 11.4655 2.02425C12.6275 3.26317 13.2513 4.91214 13.2 6.61C13.2047 6.62973 13.2047 6.65027 13.2 6.67L13.77 13.22C13.78 13.323 13.7682 13.427 13.7355 13.5252C13.7027 13.6233 13.6498 13.7136 13.58 13.79C13.5097 13.8763 13.4214 13.9461 13.3211 13.9945C13.2209 14.0429 13.1113 14.0686 13 14.07ZM1.80001 12.57H12.2L11.7 6.84V6.65C11.7515 5.34986 11.2859 4.08226 10.4051 3.12459C9.52424 2.16692 8.29991 1.59716 7.00001 1.54C5.70011 1.59716 4.47578 2.16692 3.59495 3.12459C2.71412 4.08226 2.24851 5.34986 2.30001 6.65V6.78L1.80001 12.57Z" />
    </SvgIcon>
  );
});

IconBell.displayName = 'IconBell';

export {IconBell};
