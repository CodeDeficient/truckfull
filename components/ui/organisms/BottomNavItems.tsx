/** Return navigation items for bottom nav bar with active state */
export function getBottomNavItems(activePage: string) {
  const items = [
    {
      id: 'discover',
      label: 'Discover',
      icon: 'search',
      href: '/discover',
      isActive: activePage === 'discover',
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: 'shopping-cart',
      href: '/orders',
      isActive: activePage === 'orders',
    },
    {
      id: 'favorites',
      label: 'Favorites',
      icon: 'heart',
      href: '/favorites',
      isActive: activePage === 'favorites',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: 'user',
      href: '/profile',
      isActive: activePage === 'profile',
    },
  ];

  return items;
}
