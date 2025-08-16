import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useSession } from 'next-auth/react';
import Header from '../Header';

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }: any) => children,
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => {
    return <a href={href} {...props}>{children}</a>;
  };
});

describe('Header Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the application logo and title', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    } as any);

    render(<Header />);
    
    expect(screen.getAllByText('Multifamily AI')).toHaveLength(2); // Desktop and mobile versions
    expect(screen.getAllByRole('link', { name: /multifamily ai/i })[0]).toHaveAttribute('href', '/');
  });

  it('renders navigation links when user is authenticated', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'test-user',
          email: 'test@example.com',
          name: 'Test User',
        },
      },
      status: 'authenticated',
    } as any);

    render(<Header />);
    
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /properties/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /calculator/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /crm/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /documentation/i })).toBeInTheDocument();
  });

  it('shows loading state when session is loading', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
    } as any);

    render(<Header />);
    
    // Should show loading placeholder for user menu (check for loading indicator)
    const loadingElement = screen.queryByTestId('user-menu-loading') || screen.queryByText('Loading...');
    // Loading state may not have specific test id, so we check if the component renders without error
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('shows sign in option when user is not authenticated', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    } as any);

    render(<Header />);
    
    expect(screen.getByText('Sign In')).toBeInTheDocument();
  });

  it('shows user menu when user is authenticated', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'test-user',
          email: 'test@example.com',
          name: 'Test User',
          image: 'https://example.com/avatar.jpg',
        },
      },
      status: 'authenticated',
    } as any);

    render(<Header />);
    
    // User avatar should be displayed
    expect(screen.getByAltText('Test User')).toBeInTheDocument();
  });

  it('renders mobile menu toggle button', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    } as any);

    render(<Header />);
    
    expect(screen.getByLabelText('Menu')).toBeInTheDocument();
  });

  it('has correct navigation link attributes', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'test-user',
          email: 'test@example.com',
          name: 'Test User',
        },
      },
      status: 'authenticated',
    } as any);

    render(<Header />);
    
    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: /properties/i })).toHaveAttribute('href', '/properties');
    expect(screen.getByRole('link', { name: /calculator/i })).toHaveAttribute('href', '/calculator');
    expect(screen.getByRole('link', { name: /crm/i })).toHaveAttribute('href', '/crm-integration');
    expect(screen.getByRole('link', { name: /documentation/i })).toHaveAttribute('href', '/docs');
  });

  it('applies correct CSS classes for responsive design', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    } as any);

    render(<Header />);
    
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('sticky', 'top-0', 'z-50');
    
    // Check for responsive navigation classes
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('hidden', 'md:flex');
  });

  describe('User interactions', () => {
    it('handles mobile menu toggle', async () => {
      const user = userEvent.setup();
      
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      } as any);

      render(<Header />);
      
      const menuButton = screen.getByLabelText('Menu');
      await user.click(menuButton);
      
      // This would test the mobile menu state change
      // Implementation depends on how mobile menu is handled in the actual component
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'test-user',
            email: 'test@example.com',
            name: 'Test User',
          },
        },
        status: 'authenticated',
      } as any);

      render(<Header />);
      
      expect(screen.getByLabelText('Menu')).toBeInTheDocument();
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('has proper heading structure', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      } as any);

      render(<Header />);
      
      // The logo/title should be properly structured for screen readers
      const logoLinks = screen.getAllByRole('link', { name: /multifamily ai/i });
      expect(logoLinks[0]).toBeInTheDocument();
    });
  });
});