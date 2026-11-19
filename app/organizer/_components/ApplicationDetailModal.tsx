'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TRUCKFULL_DEFAULT_LOGO } from '@/lib/utils/truckProfileImage';
import { formatPrice, parseMenuData } from '@/lib/utils/foodTruckHelpers';
import type { FoodTruck, EventFullEvent } from '@/lib/types';
import {
  Calendar,
  MessageSquareQuote,
  Utensils,
  X,
  Instagram,
  Facebook,
  Globe,
  Phone,
  Mail,
  Star,
  MapPin,
  Users,
} from 'lucide-react';

const LEADING_AT = /^@/;

export interface ApplicationWithDetails {
  id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'waitlisted' | 'withdrawn';
  created_at: string;
  cover_letter?: string | null;
  truck: FoodTruck;
  event: EventFullEvent;
}

interface ApplicationDetailModalProps {
  readonly application: ApplicationWithDetails | null;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onAccept: (id: string) => void;
  readonly onReject: (id: string) => void;
}

export function ApplicationDetailModal({
  application,
  open,
  onClose,
  onAccept,
  onReject,
}: ApplicationDetailModalProps) {
  const [activeTab, setActiveTab] = useState('application');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    '0': true,
  });

  if (!application) return null;

  const { truck, event, cover_letter, status, created_at } = application;
  const isPending = status === 'pending';

  const toggleCategory = (index: number) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [index.toString()]: !prev[index.toString()],
    }));
  };

  const statusVariant =
    status === 'accepted' ? 'success' : status === 'rejected' ? 'destructive' : 'secondary';

  // --- Menu Parsing Logic ---
  const rawMenu = truck.menu ?? truck.menu_items ?? [];
  const { categories: menuCategories, itemsByCategory: menuItemsByCategory } =
    parseMenuData(rawMenu);

  const hasMenu = menuCategories.length > 0;
  const totalMenuItems = Object.values(menuItemsByCategory).reduce(
    (acc, items) => acc + items.length,
    0,
  );

  // --- Contact Logic ---
  const social = truck.social_media || {};
  const contact = truck.contact_info || {};

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden border border-border/40 shadow-xl bg-zinc-900/95 backdrop-blur-sm sm:rounded-xl h-[85vh] sm:h-auto sm:max-h-[600px] flex flex-col">
        {/* Header - Fixed */}
        <div className="relative bg-zinc-800/50 p-0 border-b border-border/40 flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors z-10"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3 p-3 pb-2 pr-8">
            <Avatar className="h-16 w-16 border-4 border-zinc-900 shadow-xl shrink-0">
              <AvatarImage
                src={truck.image_url || TRUCKFULL_DEFAULT_LOGO}
                alt={truck.name}
                className="object-cover bg-zinc-800"
              />
              <AvatarFallback className="bg-zinc-800 text-zinc-400 text-lg font-bold">
                {truck.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1 min-w-0 flex-1">
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground truncate">
                {truck.name}
              </DialogTitle>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Utensils className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {Array.isArray(truck.cuisine_type)
                    ? truck.cuisine_type.join(', ')
                    : truck.cuisine_type || 'Various Cuisines'}
                </span>
              </div>
              <div className="flex gap-2 pt-1">
                <Badge
                  variant={statusVariant}
                  className="capitalize shadow-sm h-5 px-2 text-[10px]"
                >
                  {status}
                </Badge>
                {truck.average_rating != null && truck.average_rating > 0 && (
                  <Badge
                    variant="outline"
                    className="h-5 px-2 text-[10px] gap-1 border-yellow-800/50 text-yellow-500"
                  >
                    <Star className="h-2.5 w-2.5 fill-current" />
                    {truck.average_rating.toFixed(1)} ({truck.review_count || 0})
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex w-full p-0 h-auto bg-transparent border-b border-border/10 bg-gradient-to-b from-cyan-500/5 to-cyan-500/2 dark:from-cyan-400/8 dark:to-cyan-400/3">
              <TabsTrigger
                value="application"
                className="flex-1 rounded-none border-b-2 border-transparent bg-transparent py-2.5 text-[15px] font-medium text-cyan-600 dark:text-cyan-400 transition-all duration-200 hover:text-cyan-500 dark:hover:text-cyan-300 hover:bg-cyan-500/10 dark:hover:bg-cyan-400/10 data-[state=active]:border-cyan-400 data-[state=active]:bg-cyan-500/10 dark:data-[state=active]:bg-cyan-400/20 data-[state=active]:text-cyan-700 dark:data-[state=active]:text-cyan-100 data-[state=active]:font-semibold data-[state=active]:shadow-none"
              >
                Application
              </TabsTrigger>
              <TabsTrigger
                value="menu"
                className="flex-1 rounded-none border-b-2 border-transparent bg-transparent py-2.5 text-[15px] font-medium text-cyan-600 dark:text-cyan-400 transition-all duration-200 hover:text-cyan-500 dark:hover:text-cyan-300 hover:bg-cyan-500/10 dark:hover:bg-cyan-400/10 data-[state=active]:border-cyan-400 data-[state=active]:bg-cyan-500/10 dark:data-[state=active]:bg-cyan-400/20 data-[state=active]:text-cyan-700 dark:data-[state=active]:text-cyan-100 data-[state=active]:font-semibold data-[state=active]:shadow-none"
              >
                Menu
                {hasMenu && (
                  <span className="ml-1.5 rounded-full bg-cyan-500/20 px-1.5 py-0.5 text-[9px] text-cyan-600 dark:text-cyan-300">
                    {totalMenuItems}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="contact"
                className="flex-1 rounded-none border-b-2 border-transparent bg-transparent py-2.5 text-[15px] font-medium text-cyan-600 dark:text-cyan-400 transition-all duration-200 hover:text-cyan-500 dark:hover:text-cyan-300 hover:bg-cyan-500/10 dark:hover:bg-cyan-400/10 data-[state=active]:border-cyan-400 data-[state=active]:bg-cyan-500/10 dark:data-[state=active]:bg-cyan-400/20 data-[state=active]:text-cyan-700 dark:data-[state=active]:text-cyan-100 data-[state=active]:font-semibold data-[state=active]:shadow-none"
              >
                Contact
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-0 min-h-[100px]">
          {/* Application Tab */}
          {activeTab === 'application' && (
            <div className="p-3 space-y-3 animate-in fade-in duration-300">
              {/* Event Context */}
              <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" /> Event Application
                </h4>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground text-lg">{event.name}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      Applied on {new Date(created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Message */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <MessageSquareQuote className="h-3.5 w-3.5" /> Vendor Message
                </h4>
                <div className="relative p-5 rounded-xl bg-muted/50 border border-border/50 text-sm leading-relaxed text-foreground/90">
                  <span className="absolute top-2 left-2 text-primary/20 text-4xl font-serif">
                    “
                  </span>
                  {cover_letter ? (
                    <span className="relative z-10">{cover_letter}</span>
                  ) : (
                    <span className="relative z-10 italic text-muted-foreground">
                      No message provided with this application.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Menu Tab */}
          {activeTab === 'menu' && (
            <div className="p-3 space-y-3 animate-in fade-in duration-300">
              {hasMenu ? (
                <div className="space-y-0">
                  {menuCategories.map((category, idx) => {
                    const isExpanded = expandedCategories[idx.toString()] ?? false;
                    return (
                      <div key={category} className="border-b border-border/20 last:border-0">
                        <button
                          onClick={() => toggleCategory(idx)}
                          className="w-full flex items-center justify-between p-3 hover:bg-cyan-500/5 dark:hover:bg-cyan-400/5 transition-colors text-left group"
                        >
                          <h4 className="text-[15px] font-semibold text-cyan-700 dark:text-cyan-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                            {category}
                          </h4>
                          <span className="flex items-center justify-center w-5 h-5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-sm font-bold">
                            {isExpanded ? '−' : '+'}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="px-3 pb-3 pt-0 grid gap-2 animate-in slide-in-from-top-1 duration-200">
                            {menuItemsByCategory[category].map((item) => (
                              <div
                                key={item.id}
                                className="flex justify-between items-start text-sm py-1"
                              >
                                <div className="space-y-0.5 pr-4">
                                  <div className="font-medium text-foreground/90">
                                    {item.name}
                                    {item.is_popular && (
                                      <span className="ml-2 text-[10px] text-yellow-500 border border-yellow-900/30 bg-yellow-900/10 px-1 rounded">
                                        POPULAR
                                      </span>
                                    )}
                                  </div>
                                  {item.description && (
                                    <div className="text-xs text-muted-foreground line-clamp-2">
                                      {item.description}
                                    </div>
                                  )}
                                </div>
                                {item.price && (
                                  <div className="font-medium text-foreground tabular-nums whitespace-nowrap">
                                    {formatPrice(item.price)}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Utensils className="h-10 w-10 mb-3 opacity-20" />
                  <p>No menu items available for this vendor.</p>
                </div>
              )}
            </div>
          )}

          {/* Contact Tab */}
          {activeTab === 'contact' && (
            <div className="p-3 space-y-3 animate-in fade-in duration-300">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Direct Contact */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" /> Direct Contact
                  </h4>
                  <div className="rounded-lg border bg-zinc-900/50 p-4 space-y-3">
                    {contact.phone ? (
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                      >
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <Phone className="h-4 w-4" />
                        </div>
                        <span>{contact.phone}</span>
                      </a>
                    ) : (
                      <div className="text-sm text-muted-foreground italic pl-1">
                        No phone listed
                      </div>
                    )}

                    {contact.email ? (
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                      >
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <Mail className="h-4 w-4" />
                        </div>
                        <span>{contact.email}</span>
                      </a>
                    ) : (
                      <div className="text-sm text-muted-foreground italic pl-1">
                        No email listed
                      </div>
                    )}
                  </div>
                </div>

                {/* Online Presence */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5" /> Online
                  </h4>
                  <div className="rounded-lg border bg-zinc-900/50 p-4 space-y-3">
                    {(typeof contact.website === 'string' ||
                      typeof social.website === 'string') && (
                      <a
                        href={(contact.website || social.website) as string}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                      >
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <Globe className="h-4 w-4" />
                        </div>
                        <span>Website</span>
                      </a>
                    )}
                    {social.instagram && (
                      <a
                        href={`https://instagram.com/${social.instagram.replace(LEADING_AT, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                      >
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <Instagram className="h-4 w-4" />
                        </div>
                        <span>@{social.instagram.replace(LEADING_AT, '')}</span>
                      </a>
                    )}
                    {social.facebook && (
                      <a
                        href={social.facebook}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                      >
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                          <Facebook className="h-4 w-4" />
                        </div>
                        <span>Facebook</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {truck.current_location?.address && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" /> Current Location
                  </h4>
                  <div className="rounded-lg border bg-zinc-900/50 p-4 text-sm">
                    {truck.current_location.address}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions - Fixed at Bottom */}
        <div className="p-3 bg-zinc-800/80 backdrop-blur border-t border-border/40 flex items-center justify-end gap-2 flex-shrink-0">
          {isPending && (
            <>
              <Button
                variant="outline"
                className="border-red-900/30 text-red-400 hover:bg-red-950/30 hover:text-red-300"
                onClick={() => {
                  onReject(application.id);
                  onClose();
                }}
              >
                Reject
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 hover:shadow-emerald-400/60 transition-all duration-300 hover:scale-100"
                onClick={() => {
                  onAccept(application.id);
                  onClose();
                }}
              >
                Accept Application
              </Button>
            </>
          )}
          {!isPending && (
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
