import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ErrorView from './ErrorView';

afterEach(() => {
  cleanup();
});

describe('ErrorView', () => {
  it('should_render_the_error_message', () => {
    render(<ErrorView code="RATE_LIMITED" message="Aguarde um pouco." onRetry={() => {}} />);
    expect(screen.getByText('Aguarde um pouco.')).toBeTruthy();
  });

  it('should_show_connect_button_when_code_is_NOT_CONNECTED', () => {
    const onRetry = vi.fn();
    render(<ErrorView code="NOT_CONNECTED" message="Conecte sua conta." onRetry={onRetry} />);
    const button = screen.getByRole('button', { name: 'Conectar conta' });
    expect(button).toBeTruthy();
    button.click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should_not_show_connect_button_for_other_error_codes', () => {
    render(<ErrorView code="NO_TEXT" message="Sem texto." onRetry={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Conectar conta' })).toBeNull();
  });

  it('should_not_show_connect_button_for_UNKNOWN_error', () => {
    render(<ErrorView code="UNKNOWN" message="Erro desconhecido." onRetry={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Conectar conta' })).toBeNull();
  });
});