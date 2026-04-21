import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MultiSelectDropdown, type MultiSelectOption } from './MultiSelectDropdown';

const OPTIONS: MultiSelectOption[] = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C' },
];

function setup(selectedValues: string[] = [], onChange = vi.fn()) {
  render(
    <MultiSelectDropdown
      options={OPTIONS}
      selectedValues={selectedValues}
      onChange={onChange}
      placeholder="Choisir..."
    />,
  );
  return { onChange };
}

describe('MultiSelectDropdown — label', () => {
  it('affiche le placeholder si rien de sélectionné', () => {
    setup([]);
    expect(screen.getByRole('button', { name: 'Choisir...' })).toBeInTheDocument();
  });

  it('affiche "N sélectionné(s)" si sélection partielle', () => {
    setup(['a', 'b']);
    expect(screen.getByRole('button', { name: '2 sélectionnés' })).toBeInTheDocument();
  });

  it('affiche "1 sélectionné" au singulier', () => {
    setup(['a']);
    expect(screen.getByRole('button', { name: '1 sélectionné' })).toBeInTheDocument();
  });

  it('affiche "Tous (N)" si tout sélectionné', () => {
    setup(['a', 'b', 'c']);
    expect(screen.getByRole('button', { name: 'Tous (3)' })).toBeInTheDocument();
  });
});

describe('MultiSelectDropdown — dropdown', () => {
  it('masque les options par défaut', () => {
    setup();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('affiche les options après clic', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Choisir...' }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
  });

  it('affiche "Aucune option" si options vides', () => {
    render(<MultiSelectDropdown options={[]} selectedValues={[]} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Aucune option')).toBeInTheDocument();
  });
});

describe('MultiSelectDropdown — sélection', () => {
  it('appelle onChange avec la valeur ajoutée', () => {
    const { onChange } = setup([]);
    fireEvent.click(screen.getByRole('button', { name: 'Choisir...' }));
    fireEvent.click(screen.getByRole('option', { name: /Option A/ }));
    expect(onChange).toHaveBeenCalledWith(['a']);
  });

  it('appelle onChange sans la valeur désélectionnée', () => {
    const { onChange } = setup(['a', 'b']);
    fireEvent.click(screen.getByRole('button', { name: '2 sélectionnés' }));
    fireEvent.click(screen.getByRole('option', { name: /Option A/ }));
    expect(onChange).toHaveBeenCalledWith(['b']);
  });

  it('"Tout cocher" sélectionne toutes les options', () => {
    const { onChange } = setup([]);
    fireEvent.click(screen.getByRole('button', { name: 'Choisir...' }));
    fireEvent.click(screen.getByText('Tout cocher'));
    expect(onChange).toHaveBeenCalledWith(['a', 'b', 'c']);
  });

  it('"Tout décocher" vide la sélection', () => {
    const { onChange } = setup(['a', 'b']);
    fireEvent.click(screen.getByRole('button', { name: '2 sélectionnés' }));
    fireEvent.click(screen.getByText('Tout décocher'));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
