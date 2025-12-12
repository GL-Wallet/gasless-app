import React, {
  memo, useEffect, useMemo, useRef,
} from '../../../../lib/teact/teact';
import { getActions, withGlobal } from '../../../../global';

import type { ApiStakingState } from '../../../../api/types';
import { ContentTab } from '../../../../global/types';

import {
  IS_CAPACITOR,
  IS_CORE_WALLET,
  IS_TELEGRAM_APP,
  LANDSCAPE_MIN_ASSETS_TAB_VIEW,
  PORTRAIT_MIN_ASSETS_TAB_VIEW,
} from '../../../../config';
import { requestMutation } from '../../../../lib/fasterdom/fasterdom';
import { getIsActiveStakingState } from '../../../../global/helpers/staking';
import {
  selectAccountStakingStates,
  selectCurrentAccountState,
  selectCurrentAccountTokens,
  selectEnabledTokensCountMemoizedFor,
} from '../../../../global/selectors';
import buildClassName from '../../../../util/buildClassName';
import { getStatusBarHeight } from '../../../../util/capacitor';
import { captureEvents, SwipeDirection } from '../../../../util/captureEvents';
import { getTelegramApp } from '../../../../util/telegram';
import { IS_TOUCH_ENV, STICKY_CARD_INTERSECTION_THRESHOLD } from '../../../../util/windowEnvironment';
import windowSize from '../../../../util/windowSize';

import { useDeviceScreen } from '../../../../hooks/useDeviceScreen';
import useEffectOnce from '../../../../hooks/useEffectOnce';
import useHistoryBack from '../../../../hooks/useHistoryBack';
import useLang from '../../../../hooks/useLang';
import useLastCallback from '../../../../hooks/useLastCallback';

import CategoryHeader from '../../../explore/CategoryHeader';
import Explore from '../../../explore/Explore';
import TabList, { type TabWithProperties } from '../../../ui/TabList';
import Transition from '../../../ui/Transition';
import Activity from './Activities';
import Assets from './Assets';

import styles from './Content.module.scss';

interface OwnProps {
  onStakedTokenClick: NoneToVoidFunction;
}

interface StateProps {
  tokensCount: number;
  activeContentTab?: ContentTab;
  states?: ApiStakingState[];
  hasVesting: boolean;
  isFullscreen?: boolean;
  currentSiteCategoryId?: number;
}

function Content({
  activeContentTab,
  tokensCount,
  onStakedTokenClick,
  states,
  hasVesting,
  isFullscreen,
  currentSiteCategoryId,
}: OwnProps & StateProps) {
  const {
    selectToken,
    showTokenActivity,
    setActiveContentTab,
  } = getActions();

  const lang = useLang();
  const { isPortrait } = useDeviceScreen();
  // eslint-disable-next-line no-null/no-null
  const tabsRef = useRef<HTMLDivElement>(null);
  const numberOfStaking = useMemo(() => {
    return states?.filter(getIsActiveStakingState).length ?? 0;
  }, [states]);

  // eslint-disable-next-line no-null/no-null
  const transitionRef = useRef<HTMLDivElement>(null);

  const totalTokensAmount = tokensCount + (hasVesting ? 1 : 0) + numberOfStaking;
  const shouldShowSeparateAssetsPanel = totalTokensAmount <= (
    isPortrait ? PORTRAIT_MIN_ASSETS_TAB_VIEW : LANDSCAPE_MIN_ASSETS_TAB_VIEW
  );

  const tabs = useMemo(
    () => [
      !shouldShowSeparateAssetsPanel
        ? { id: ContentTab.Assets, title: lang('Assets'), className: styles.tab }
        : undefined,
      { id: ContentTab.Activity, title: lang('Activity'), className: styles.tab },
      !isPortrait && !IS_CORE_WALLET
        ? { id: ContentTab.Explore, title: lang('Explore'), className: styles.tab }
        : undefined,
    ].filter(Boolean) as TabWithProperties[],
    [lang, shouldShowSeparateAssetsPanel, isPortrait],
  );

  const activeTabIndex = useMemo(
    () => {
      const tabIndex = tabs.findIndex((tab) => tab.id === activeContentTab);

      if (tabIndex === -1) {
        return ContentTab.Assets;
      }

      return tabIndex;
    },
    [tabs, activeContentTab],
  );

  useEffectOnce(() => {
    if (activeContentTab === undefined) {
      setActiveContentTab({ tab: ContentTab.Assets });
    }
  });

  const handleSwitchTab = useLastCallback((tab: ContentTab) => {
    selectToken({ slug: undefined }, { forceOnHeavyAnimation: true });
    setActiveContentTab({ tab });
  });

  useHistoryBack({
    isActive: activeTabIndex !== 0,
    onBack: () => handleSwitchTab(ContentTab.Assets),
  });

  useEffect(() => {
    const stickyElm = tabsRef.current;
    if (!isPortrait || !stickyElm) return undefined;

    const safeAreaTop = IS_CAPACITOR
      ? getStatusBarHeight()
      : IS_TELEGRAM_APP
        ? getTelegramApp()!.safeAreaInset.top + getTelegramApp()!.contentSafeAreaInset.top
        : windowSize.get().safeAreaTop;
    const rootMarginTop = STICKY_CARD_INTERSECTION_THRESHOLD - safeAreaTop - 1;

    const observer = new IntersectionObserver(([e]) => {
      requestMutation(() => {
        e.target.classList.toggle(styles.tabsContainerStuck, e.intersectionRatio < 1);
      });
    }, {
      rootMargin: `${rootMarginTop}px 0px 0px 0px`,
      threshold: [1],
    });
    observer.observe(stickyElm);

    return () => {
      observer.unobserve(stickyElm);
    };
  }, [isPortrait, tabsRef, isFullscreen]);

  useEffect(() => {
    if (!IS_TOUCH_ENV) {
      return undefined;
    }

    return captureEvents(transitionRef.current!, {
      includedClosestSelector: '.swipe-container',
      excludedClosestSelector: '.dapps-feed',
      onSwipe: (e, direction) => {
        if (direction === SwipeDirection.Left) {
          const tab = tabs[Math.min(tabs.length - 1, activeTabIndex + 1)];
          handleSwitchTab(tab.id);
          return true;
        } else if (direction === SwipeDirection.Right) {
          const tab = tabs[Math.max(0, activeTabIndex - 1)];
          handleSwitchTab(tab.id);
          return true;
        }

        return false;
      },
      selectorToPreventScroll: '.custom-scroll',
    });
  }, [tabs, handleSwitchTab, activeTabIndex]);

  const handleClickAsset = useLastCallback((slug: string) => {
    showTokenActivity({ slug });
  });

  const containerClassName = buildClassName(
    styles.container,
    IS_TOUCH_ENV && 'swipe-container',
    isPortrait ? styles.portraitContainer : styles.landscapeContainer,
  );

  function renderTabsPanel() {
    if (!isPortrait && currentSiteCategoryId) {
      return <CategoryHeader id={currentSiteCategoryId} />;
    }

    return (
      <TabList
        tabs={tabs}
        activeTab={activeTabIndex}
        onSwitchTab={handleSwitchTab}
        className={buildClassName(styles.tabs, 'content-tabslist')}
      />
    );
  }

  function renderCurrentTab(isActive: boolean) {
    // When assets are shown separately, there is effectively no tab with index 0,
    // so we fall back to next tab to not break parent's component logic.
    if (activeTabIndex === 0 && shouldShowSeparateAssetsPanel) {
      return <Activity isActive={isActive} totalTokensAmount={totalTokensAmount} />;
    }

    switch (tabs[activeTabIndex].id) {
      case ContentTab.Assets:
        return <Assets isActive={isActive} onTokenClick={handleClickAsset} onStakedTokenClick={onStakedTokenClick} />;
      case ContentTab.Activity:
        return <Activity isActive={isActive} totalTokensAmount={totalTokensAmount} />;
      case ContentTab.Explore:
        return <Explore isActive={isActive} />;
      default:
        return undefined;
    }
  }

  function renderContent() {
    const activeKey = (!isPortrait && currentSiteCategoryId) ? 2 : 0;

    return (
      <>
        <div ref={tabsRef} className={styles.tabsContainer}>
          <Transition activeKey={activeKey} name="slideFade" className={styles.tabsContent}>
            {renderTabsPanel()}
          </Transition>
        </div>
        <Transition
          ref={transitionRef}
          name={isPortrait ? 'slide' : 'slideFade'}
          activeKey={activeTabIndex}
          renderCount={tabs.length}
          className={buildClassName(styles.slides, 'content-transition')}
          slideClassName={buildClassName(styles.slide, 'custom-scroll')}
        >
          {renderCurrentTab}
        </Transition>
      </>
    );
  }

  return (
    <div className={containerClassName}>
      {shouldShowSeparateAssetsPanel && (
        <div className={styles.assetsPanel}>
          <Assets
            isActive
            isSeparatePanel
            onStakedTokenClick={onStakedTokenClick}
            onTokenClick={handleClickAsset}
          />
        </div>
      )}
      <div className={buildClassName(isPortrait ? styles.contentPanel : styles.landscapeContentPanel)}>
        {renderContent()}
      </div>
    </div>
  );
}

export default memo(
  withGlobal<OwnProps>(
    (global): StateProps => {
      const accountId = global.currentAccountId;
      const {
        activeContentTab,
        vesting,
        currentSiteCategoryId,
      } = selectCurrentAccountState(global) ?? {};

      const tokens = selectCurrentAccountTokens(global);
      const tokensCount = selectEnabledTokensCountMemoizedFor(global.currentAccountId!)(tokens);
      const hasVesting = Boolean(vesting?.info?.length);
      const states = accountId ? selectAccountStakingStates(global, accountId) : undefined;

      return {
        tokensCount,
        activeContentTab,
        states,
        hasVesting,
        currentSiteCategoryId,
        isFullscreen: global.isFullscreen,
      };
    },
    (global, _, stickToFirst) => stickToFirst(global.currentAccountId),
  )(Content),
);
