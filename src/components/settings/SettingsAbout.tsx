import React, { memo } from '../../lib/teact/teact';

import {
  APP_ENV_MARKER, APP_NAME, APP_VERSION,
} from '../../config';
import renderText from '../../global/helpers/renderText';
import buildClassName from '../../util/buildClassName';

// import { handleOpenUrl } from '../../util/openUrl';
import useHistoryBack from '../../hooks/useHistoryBack';
import useLang from '../../hooks/useLang';
import useScrolledState from '../../hooks/useScrolledState';

import Button from '../ui/Button';
// import Emoji from '../ui/Emoji';
import ModalHeader from '../ui/ModalHeader';

import styles from './Settings.module.scss';

import logoLightPath from '../../assets/logoLight.svg';

interface OwnProps {
  isActive?: boolean;
  isInsideModal?: boolean;
  headerClassName?: string;
  handleBackClick: NoneToVoidFunction;
}

function SettingsAbout({
  isActive, isInsideModal, headerClassName, handleBackClick,
}: OwnProps) {
  const lang = useLang();

  useHistoryBack({
    isActive,
    onBack: handleBackClick,
  });

  const {
    handleScroll: handleContentScroll,
    isScrolled,
  } = useScrolledState();

  // const appTheme = useAppTheme(theme);
  const logoPath = logoLightPath; // Default to light theme logo
  // const aboutExtensionTitle = lang('$about_extension_link_text', { app_name: APP_NAME });

  return (
    <div className={styles.slide}>
      {isInsideModal ? (
        <ModalHeader
          title={lang('About %app_name%', { app_name: APP_NAME })}
          withNotch={isScrolled}
          onBackButtonClick={handleBackClick}
          className={styles.modalHeader}
        />
      ) : (
        <div className={buildClassName(
          styles.header,
          headerClassName,
          'with-notch-on-scroll',
          isScrolled && 'is-scrolled',
        )}>
          <Button isSimple isText onClick={handleBackClick} className={styles.headerBack}>
            <i className={buildClassName(styles.iconChevron, 'icon-chevron-left')} aria-hidden />
            <span>{lang('Back')}</span>
          </Button>
          <span className={styles.headerTitle}>{lang('About %app_name%', { app_name: APP_NAME })}</span>
        </div>
      )}
      <div
        className={buildClassName(
          styles.content,
          isInsideModal && 'custom-scroll',
          !isInsideModal && styles.content_noScroll,
        )}
        onScroll={isInsideModal ? handleContentScroll : undefined}
      >
        <img src={logoPath} alt={lang('Logo')} className={styles.logo} />
        <h2 className={styles.title}>
          {APP_NAME} {APP_VERSION} {APP_ENV_MARKER}
        </h2>
        <div className={buildClassName(styles.blockAbout, !isInsideModal && 'custom-scroll')}>
          <p className={styles.text}>
            {renderText(lang('$about_description1'))}
          </p>
          <p className={styles.text}>
            {renderText(lang('$about_description2'))}
          </p>
        </div>
      </div>
    </div>
  );
}

export default memo(SettingsAbout);
