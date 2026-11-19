import Link from '@/components/navigation/IntentLink';
import {
  Home,
  Truck,
  Users,
  BarChart3,
  Settings,
  Database,
  Activity,
  Wrench,
  Mail,
  ShieldAlert,
  ClipboardList,
  Inbox,
} from 'lucide-react';
import * as React from 'react';

interface AdminNavLinksProps {
  readonly isMobile?: boolean;
}

interface NavItem {
  href: string;
  icon: React.FC<{ className?: string }>;
  label: string;
  category?: string;
}

interface Category {
  id: string;
  label: string;
}

/**
 * Renders a set of navigation links for the admin panel.
 * @example
 * AdminNavLinks({ isMobile: true })
 * <Some JSX structure with customized class names>
 * @param {boolean} isMobile - Determines the styling of the links for mobile or desktop view.
 * @returns {JSX.Element} A group of navigation links with appropriate icons for the admin section.
 * @description
 *   - Utilizes a ternary operation to dynamically assign different class names based on the isMobile flag.
 *   - Each link contains an icon specific to the administration section it represents.
 */
export function AdminNavLinks({ isMobile = false }: Readonly<AdminNavLinksProps>) {
  const linkClassName = isMobile
    ? 'mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground'
    : 'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary';

  const iconClassName = isMobile ? 'h-5 w-5' : 'h-4 w-4';

  const HomeIcon: React.FC<{ className?: string }> = (props) => <Home {...props} />;
  const TruckIcon: React.FC<{ className?: string }> = (props) => <Truck {...props} />;
  const UsersIcon: React.FC<{ className?: string }> = (props) => <Users {...props} />;
  const BarChartIcon: React.FC<{ className?: string }> = (props) => <BarChart3 {...props} />;
  const SettingsIcon: React.FC<{ className?: string }> = (props) => <Settings {...props} />;
  const DatabaseIcon: React.FC<{ className?: string }> = (props) => <Database {...props} />;
  const ActivityIcon: React.FC<{ className?: string }> = (props) => <Activity {...props} />;
  const WrenchIcon: React.FC<{ className?: string }> = (props) => <Wrench {...props} />;
  const MailIcon: React.FC<{ className?: string }> = (props) => <Mail {...props} />;
  const ShieldAlertIcon: React.FC<{ className?: string }> = (props) => <ShieldAlert {...props} />;

  const ClipboardListIcon: React.FC<{ className?: string }> = (props) => (
    <ClipboardList {...props} />
  );
  const InboxIcon: React.FC<{ className?: string }> = (props) => <Inbox {...props} />;

  const navItems: NavItem[] = [
    { href: '/admin', icon: HomeIcon, label: 'Dashboard', category: 'main' },
    { href: '/admin/food-trucks', icon: TruckIcon, label: 'Food Trucks', category: 'management' },
    { href: '/admin/users', icon: UsersIcon, label: 'Users', category: 'management' },
    {
      href: '/admin/listing-submissions',
      icon: InboxIcon,
      label: 'Listing Submissions',
      category: 'management',
    },
    {
      href: '/admin/invite-owners',
      icon: MailIcon,
      label: 'Invite Owners',
      category: 'management',
    },
    {
      href: '/admin/fraud-detection',
      icon: ShieldAlertIcon,
      label: 'Fraud Detection',
      category: 'monitoring',
    },
    {
      href: '/admin/data-quality',
      icon: BarChartIcon,
      label: 'Data Quality',
      category: 'monitoring',
    },
    { href: '/admin/pipeline', icon: ActivityIcon, label: 'Pipeline', category: 'monitoring' },
    { href: '/admin/data-cleanup', icon: DatabaseIcon, label: 'Data Cleanup', category: 'tools' },
    {
      href: '/admin/menu-enrichment',
      icon: ClipboardListIcon,
      label: 'Menu Enrichment',
      category: 'tools',
    },
    { href: '/admin/system', icon: SettingsIcon, label: 'System', category: 'configuration' },
    { href: '/admin/tools', icon: WrenchIcon, label: 'Admin Tools', category: 'tools' },
  ];

  // Group items by category for better organization
  const categories: Category[] = [
    { id: 'main', label: 'Main' },
    { id: 'management', label: 'Management' },
    { id: 'monitoring', label: 'Monitoring' },
    { id: 'tools', label: 'Tools' },
    { id: 'configuration', label: 'Configuration' },
  ];

  if (isMobile) {
    return (
      <>
        {navItems.map((item) => (
          <Link href={item.href} className={linkClassName} key={item.href}>
            <item.icon className={iconClassName} />
            {item.label}
          </Link>
        ))}
      </>
    );
  }

  return (
    <>
      {categories.map((category) => {
        const categoryItems = navItems.filter((item) => item.category === category.id);
        if (categoryItems.length === 0) return;

        return (
          <div key={category.id} className="space-y-1">
            <h3 className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {category.label}
            </h3>
            {categoryItems.map((item) => (
              <Link href={item.href} className={linkClassName} key={item.href}>
                <item.icon className={iconClassName} />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        );
      })}
    </>
  );
}
