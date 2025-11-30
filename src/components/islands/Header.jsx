import React from 'react';
import {
    Navbar,
    NavbarBrand,
    NavbarContent,
    NavbarItem,
    NavbarMenuToggle,
    NavbarMenu,
    NavbarMenuItem,
    Link,
    Button,
} from '@heroui/react';
import ThemeToggle from './ThemeToggle';
import SearchBar from './SearchBar';

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    const menuItems = [
        { name: '検索', href: '/search' },
        { name: '比較', href: '/compare' },
        { name: 'お得', href: '/deals' },
    ];

    return (
        <Navbar
            onMenuOpenChange={setIsMenuOpen}
            maxWidth="xl"
            className="fixed top-0 w-full z-50 backdrop-blur-lg bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800"
            classNames={{
                wrapper: "px-4 sm:px-6",
            }}
        >
            <NavbarContent>
                <NavbarMenuToggle
                    aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                    className="sm:hidden"
                />
                <NavbarBrand>
                    <Link href="/" className="flex items-center space-x-2 group">
                        <div className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform duration-300">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM8 7a2 2 0 114 0 2 2 0 01-4 0z" />
                                <path d="M10 12a2 2 0 100 4 2 2 0 000-4z" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
                            Yabaii
                        </span>
                    </Link>
                </NavbarBrand>
            </NavbarContent>

            <NavbarContent className="hidden sm:flex flex-1 max-w-xl mx-8" justify="center">
                <SearchBar />
            </NavbarContent>

            <NavbarContent className="hidden sm:flex gap-2" justify="end">
                {menuItems.map((item) => (
                    <NavbarItem key={item.name}>
                        <Link
                            href={item.href}
                            className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-400"
                        >
                            {item.name}
                        </Link>
                    </NavbarItem>
                ))}
                <NavbarItem>
                    <ThemeToggle />
                </NavbarItem>
                <NavbarItem>
                    <Button as={Link} href="/login" variant="light" size="sm">
                        ログイン
                    </Button>
                </NavbarItem>
                <NavbarItem>
                    <Button as={Link} href="/register" color="primary" size="sm">
                        登録する
                    </Button>
                </NavbarItem>
            </NavbarContent>

            <NavbarMenu className="pt-6">
                <div className="mb-4 px-2">
                    <SearchBar />
                </div>
                {menuItems.map((item, index) => (
                    <NavbarMenuItem key={`${item.name}-${index}`}>
                        <Link
                            href={item.href}
                            className="w-full text-lg"
                            size="lg"
                        >
                            {item.name}
                        </Link>
                    </NavbarMenuItem>
                ))}
                <NavbarMenuItem>
                    <div className="flex items-center justify-between w-full pt-4 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-sm text-gray-600 dark:text-gray-400">テーマ</span>
                        <ThemeToggle />
                    </div>
                </NavbarMenuItem>
                <NavbarMenuItem>
                    <Button as={Link} href="/login" variant="light" className="w-full" size="lg">
                        ログイン
                    </Button>
                </NavbarMenuItem>
                <NavbarMenuItem>
                    <Button as={Link} href="/register" color="primary" className="w-full" size="lg">
                        登録する
                    </Button>
                </NavbarMenuItem>
            </NavbarMenu>
        </Navbar>
    );
}
