import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import Section from './Section';

afterEach(() => {
  cleanup();
});

describe('Section', () => {
  it('should_render_the_title_in_an_h4', () => {
    render(<Section title="Score por Skill">conteúdo</Section>);
    const heading = screen.getByRole('heading', { level: 4 });
    expect(heading.textContent).toBe('Score por Skill');
  });

  it('should_render_children_inside_the_section', () => {
    render(
      <Section title="Dicas">
        <p>dica 1</p>
      </Section>,
    );
    expect(screen.getByText('dica 1')).toBeTruthy();
  });

  it('should_wrap_content_in_a_section_div', () => {
    const { container } = render(<Section title="Título">filho</Section>);
    const section = container.querySelector('.section');
    expect(section).not.toBeNull();
    expect(section?.textContent).toContain('filho');
  });
});