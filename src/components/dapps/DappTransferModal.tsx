import React, { memo, useMemo } from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { ApiActivity, ApiDappTransfer, ApiToken } from '../../api/types';
import type { GlobalState } from '../../global/types';
import { TransferState } from '../../global/types';

import { IS_CAPACITOR } from '../../config';
import { selectCurrentDappTransferTotals } from '../../global/selectors';
import { getDoesUsePinPad } from '../../util/biometrics';
import buildClassName from '../../util/buildClassName';
import resolveSlideTransitionName from '../../util/resolveSlideTransitionName';

import useLang from '../../hooks/useLang';
import useLastCallback from '../../hooks/useLastCallback';
import useModalTransitionKeys from '../../hooks/useModalTransitionKeys';

import LedgerConfirmOperation from '../ledger/LedgerConfirmOperation';
import LedgerConnect from '../ledger/LedgerConnect';
import { getActivityHeight } from '../main/sections/Content/Activity';
import Modal from '../ui/Modal';
import ModalHeader from '../ui/ModalHeader';
import PasswordForm from '../ui/PasswordForm';
import Transition from '../ui/Transition';
import DappLedgerWarning from './DappLedgerWarning';
import DappTransaction from './DappTransaction';
import DappTransferComplete from './DappTransferComplete';
import DappTransferInitial from './DappTransferInitial';

import modalStyles from '../ui/Modal.module.scss';
import styles from './Dapp.module.scss';

interface StateProps {
  currentDappTransfer: GlobalState['currentDappTransfer'];
  tokensBySlug: Record<string, ApiToken>;
  isMediaViewerOpen?: boolean;
  isDangerous: boolean;
}

function DappTransferModal({
  currentDappTransfer: {
    isLoading,
    viewTransactionOnIdx,
    state,
    transactions,
    emulation,
    error,
  },
  tokensBySlug,
  isMediaViewerOpen,
  isDangerous,
}: StateProps) {
  const {
    setDappTransferScreen,
    clearDappTransferError,
    submitDappTransferPassword,
    submitDappTransferHardware,
    closeDappTransfer,
    cancelDappTransfer,
  } = getActions();

  const lang = useLang();

  const isOpen = state !== TransferState.None;

  const { renderingKey, nextKey, updateNextKey } = useModalTransitionKeys(state, isOpen);
  const needsExtraHeight = useMemo(
    () => shouldForceFullScreen(transactions, emulation?.activities, isDangerous),
    [transactions, emulation, isDangerous],
  );

  const handleBackClick = useLastCallback(() => {
    if (state === TransferState.Confirm || state === TransferState.Password) {
      setDappTransferScreen({ state: TransferState.Initial });
    }
  });

  const handleTransferPasswordSubmit = useLastCallback((password: string) => {
    submitDappTransferPassword({ password });
  });

  const handleLedgerConnect = useLastCallback(() => {
    submitDappTransferHardware();
  });

  const handleResetTransfer = useLastCallback(() => {
    cancelDappTransfer();
    updateNextKey();
  });

  function renderPassword(isActive: boolean) {
    return (
      <>
        {!getDoesUsePinPad() && (
          <ModalHeader title={lang('Confirm Action')} onClose={closeDappTransfer} />
        )}
        <PasswordForm
          isActive={isActive}
          isLoading={isLoading}
          error={error}
          withCloseButton={IS_CAPACITOR}
          submitLabel={lang('Send')}
          cancelLabel={lang('Back')}
          onSubmit={handleTransferPasswordSubmit}
          onCancel={handleBackClick}
          onUpdate={clearDappTransferError}
        />
      </>
    );
  }

  function renderContent(isActive: boolean, isFrom: boolean, currentKey: TransferState) {
    switch (currentKey) {
      case TransferState.Initial:
        return <DappTransferInitial onClose={closeDappTransfer} />;

      case TransferState.WarningHardware:
        return (
          <>
            <ModalHeader title={lang('Send Transaction')} onClose={closeDappTransfer} />
            <DappLedgerWarning />
          </>
        );

      case TransferState.Confirm:
        return (
          <DappTransaction
            transaction={viewTransactionOnIdx !== undefined ? transactions?.[viewTransactionOnIdx] : undefined}
            tokensBySlug={tokensBySlug}
            isActive={isActive}
            onBack={handleBackClick}
            onClose={closeDappTransfer}
          />
        );

      case TransferState.Password:
        return renderPassword(isActive);

      case TransferState.ConnectHardware:
        return (
          <LedgerConnect
            isActive={isActive}
            onConnected={handleLedgerConnect}
            onClose={closeDappTransfer}
          />
        );

      case TransferState.ConfirmHardware:
        return (
          <LedgerConfirmOperation
            text={lang('Please confirm transaction on your Ledger')}
            error={error}
            onTryAgain={submitDappTransferHardware}
            onClose={closeDappTransfer}
          />
        );

      case TransferState.Complete:
        return (
          <DappTransferComplete
            isActive={isActive}
            onClose={closeDappTransfer}
          />
        );
    }
  }

  return (
    <Modal
      hasCloseButton
      isOpen={isOpen && !isMediaViewerOpen}
      noBackdropClose
      dialogClassName={buildClassName(styles.modalDialog, needsExtraHeight && styles.modalDialogExtraHeight)}
      nativeBottomSheetKey="dapp-transfer"
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      forceFullNative={needsExtraHeight || renderingKey === TransferState.Password}
      onClose={closeDappTransfer}
      onCloseAnimationEnd={handleResetTransfer}
    >
      <Transition
        name={resolveSlideTransitionName()}
        className={buildClassName(modalStyles.transition, 'custom-scroll')}
        slideClassName={modalStyles.transitionSlide}
        activeKey={renderingKey}
        nextKey={nextKey}
        onStop={updateNextKey}
      >
        {renderContent}
      </Transition>
    </Modal>
  );
}

export default memo(withGlobal((global): StateProps => {
  const { isDangerous } = selectCurrentDappTransferTotals(global);

  return {
    currentDappTransfer: global.currentDappTransfer,
    tokensBySlug: global.tokenInfo.bySlug,
    isMediaViewerOpen: Boolean(global.mediaViewer.mediaId),
    isDangerous,
  };
})(DappTransferModal));

function shouldForceFullScreen(transactions?: ApiDappTransfer[], activities?: ApiActivity[], isDangerous?: boolean) {
  let height = 0; // rem

  if (transactions) {
    height += transactions.length * 3;
    if (transactions.length > 1) height += 5.125; // The Total Amount field
  }

  if (activities) {
    for (const activity of activities) {
      height += getActivityHeight(activity, true);
    }
  }

  if (isDangerous) {
    height += 4.6;
  }

  return height >= 14.5; // The actual available height is 15.125. Leaving a margin just in case.
}
