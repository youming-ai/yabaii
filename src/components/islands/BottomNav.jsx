import React from 'react';
import { Button } from '@heroui/react';
import { Home, Search, ShoppingBag, User } from 'lucide-react';

export default function BottomNav() {
    const navItems = [
        { name: 'ホーム', icon: Home, href: '/', active: true },
        { name: '検索', icon: Search, href: '/search', active: false },
        { name: 'お得', icon: ShoppingBag, href: '/deals', active: false },
        { name: 'プロフィール', icon: User, href: '/profile', active: false },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
            <div className="grid grid-cols-4 gap-1 px-2 py-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Button
                            key={item.name}
                            as="a"
                            href={item.href}
                            variant="light"
                            className={`flex flex-col items-center justify-center h-14 ${item.active
                                ? 'text-primary'
                                : 'text-gray-600'
                                }`}
                        >
                            <Icon className="w-5 h-5 mb-1" />
                            <span className="text-xs font-medium">{item.name}</span>
                        </Button>
                    );
                })}
            </div>
        </nav>
    );
}
