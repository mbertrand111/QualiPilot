import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmModal } from './ConfirmModal';

function setup(overrides: Partial<Parameters<typeof ConfirmModal>[0]> = {}) {
  const onConfirm = vi.fn();
  const onCancel  = vi.fn();
  render(
    <ConfirmModal
      title="Titre test"
      message="Message test"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { onConfirm, onCancel };
}

describe('ConfirmModal — rendu', () => {
  it('affiche le titre et le message', () => {
    setup();
    expect(screen.getByText('Titre test')).toBeInTheDocument();
    expect(screen.getByText('Message test')).toBeInTheDocument();
  });

  it('affiche "Confirmer" par défaut', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Confirmer' })).toBeInTheDocument();
  });

  it('affiche un label personnalisé si confirmLabel fourni', () => {
    setup({ confirmLabel: 'Supprimer' });
    expect(screen.getByRole('button', { name: 'Supprimer' })).toBeInTheDocument();
  });

  it('affiche "Enregistrement…" en mode loading', () => {
    setup({ loading: true });
    expect(screen.getByRole('button', { name: 'Enregistrement…' })).toBeInTheDocument();
  });

  it('désactive les boutons en mode loading', () => {
    setup({ loading: true });
    const [, cancelBtn] = screen.getAllByRole('button', { name: 'Annuler' });
    expect(cancelBtn).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Enregistrement…' })).toBeDisabled();
  });
});

describe('ConfirmModal — interactions', () => {
  it('appelle onConfirm au clic sur le bouton de confirmation', () => {
    const { onConfirm } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('appelle onCancel au clic sur le bouton Annuler', () => {
    const { onCancel } = setup();
    // Deuxième élément dans l'ordre DOM = le vrai bouton Annuler (le premier est l'overlay)
    const [, cancelBtn] = screen.getAllByRole('button', { name: 'Annuler' });
    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('appelle onCancel au clic sur l\'overlay', () => {
    const { onCancel } = setup();
    // L'overlay a role="button" aria-label="Annuler" ; le bouton Cancel a le même nom accessible.
    // getAllByRole retourne [overlay, bouton] dans l'ordre DOM.
    const [overlay] = screen.getAllByRole('button', { name: 'Annuler' });
    fireEvent.click(overlay);
    expect(onCancel).toHaveBeenCalled();
  });

  it('appelle onCancel à l\'appui sur Escape', () => {
    const { onCancel } = setup();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
