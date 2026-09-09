import React, { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal, ModalBody } from '../components/ui/Modals';

function TestModal() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir
      </button>
      <Modal isOpen={open} onClose={() => setOpen(false)} titleId="test-modal-title">
        <ModalBody>
          <h2 id="test-modal-title">Teste</h2>
          <button type="button">Primeiro</button>
          <button type="button">Segundo</button>
        </ModalBody>
      </Modal>
    </>
  );
}

describe('Modal accessibility', () => {
  it('traps focus, closes on Escape and restores focus to the opener', async () => {
    const user = userEvent.setup();
    render(<TestModal />);

    const openButton = screen.getByRole('button', { name: 'Abrir' });
    await user.click(openButton);

    const closeButton = await screen.findByLabelText('Fechar modal');
    await waitFor(() => expect(closeButton).toHaveFocus());

    await user.tab();
    expect(screen.getByRole('button', { name: 'Primeiro' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Segundo' })).toHaveFocus();

    await user.tab();
    expect(closeButton).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(openButton).toHaveFocus();
  });
});
