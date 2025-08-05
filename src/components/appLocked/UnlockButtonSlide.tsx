import React, { memo, type RefObject } from '../../lib/teact/teact';

import { APP_NAME } from '../../config';
import buildClassName from '../../util/buildClassName';

import useLang from '../../hooks/useLang';

import Button from '../ui/Button';

import styles from './AppLocked.module.scss';

interface OwnProps {
  ref: RefObject<HTMLDivElement | null>;
  innerContentTopPosition?: number;
  handleChangeSlideForBiometricAuth: NoneToVoidFunction;
}

function UnlockButtonSlide({
  ref,
  innerContentTopPosition = 0,
  handleChangeSlideForBiometricAuth,
}: OwnProps) {
  const lang = useLang();

  return (
    <div
      ref={ref}
      className={styles.innerContent}
      style={`--position-top: ${innerContentTopPosition}px;`}
    >
      <span className={buildClassName(styles.title, 'rounded-font')}>{APP_NAME}</span>
      <Button isPrimary onClick={handleChangeSlideForBiometricAuth}>
        {lang('Unlock')}
      </Button>
    </div>
  );
}

export default memo(UnlockButtonSlide);
