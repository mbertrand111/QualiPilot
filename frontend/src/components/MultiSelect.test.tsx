import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MultiSelect } from './MultiSelect';

const OPTIONS = ['COCO', 'PIXELS', 'LACE', 'NULL.REF'];

function setup(selected: string[] = [], onChange = vi.fn()) {
  render(
    <MultiSelect
      label="Équipe"
      options={OPTIONS}
      selected={selected}
      onChange={onChange}
    />,
  );
  return { onChange };
}

describe('MultiSelect — rendu fermé', () => {
  it('affiche le label du bouton déclencheur', () => {
    setup();
    expect(screen.getByRole('button', { name: /Équipe/i })).toBeInTheDocument();
  });

  it('affiche le badge de comptage si sélection non vide', () => {
    setup(['COCO', 'PIXELS']);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('n\'affiche pas le badge si rien de sélectionné', () => {
    setup([]);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('dropdown masqué par défaut', () => {
    setup();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});

describe('MultiSelect — ouverture / fermeture', () => {
  it('ouvre le dropdown au clic', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Équipe/i }));
    expect(screen.getByText('COCO')).toBeInTheDocument();
    expect(screen.getByText('PIXELS')).toBeInTheDocument();
  });

  it('referme le dropdown au deuxième clic', () => {
    setup();
    const btn = screen.getByRole('button', { name: /Équipe/i });
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(screen.queryByText('LACE')).not.toBeInTheDocument();
  });
});

describe('MultiSelect — sélection / désélection', () => {
  it('appelle onChange avec la valeur ajoutée', () => {
    const { onChange } = setup([]);
    fireEvent.click(screen.getByRole('button', { name: /Équipe/i }));
    fireEvent.click(screen.getByLabelText('COCO'));
    expect(onChange).toHaveBeenCalledWith(['COCO']);
  });

  it('appelle onChange sans la valeur désélectionnée', () => {
    const { onChange } = setup(['COCO', 'PIXELS']);
    fireEvent.click(screen.getByRole('button', { name: /Équipe/i }));
    fireEvent.click(screen.getByLabelText('COCO'));
    expect(onChange).toHaveBeenCalledWith(['PIXELS']);
  });

  it('"Tout sélectionner" appelle onChange avec toutes les options', () => {
    const { onChange } = setup([]);
    fireEvent.click(screen.getByRole('button', { name: /Équipe/i }));
    fireEvent.click(screen.getByText('Tout sélectionner'));
    expect(onChange).toHaveBeenCalledWith(OPTIONS);
  });

  it('"Réinitialiser" appelle onChange avec tableau vide', () => {
    const { onChange } = setup(['COCO']);
    fireEvent.click(screen.getByRole('button', { name: /Équipe/i }));
    fireEvent.click(screen.getByText('Réinitialiser'));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
