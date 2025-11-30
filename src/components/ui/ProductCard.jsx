import React from 'react';
import { Card, CardHeader, CardBody, CardFooter, Image, Button, Chip } from '@heroui/react';
import { Star, ExternalLink } from 'lucide-react';

export default function ProductCard({ product }) {
    const formatPrice = (price) => {
        return parseInt(price).toLocaleString('ja-JP');
    };

    return (
        <Card
            className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            isPressable
        >
            <CardHeader className="p-0 relative overflow-hidden">
                <Image
                    src={product.image}
                    alt={product.title}
                    className="w-full object-cover aspect-[4/3] group-hover:scale-110 transition-transform duration-500"
                    removeWrapper
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                {product.discount && (
                    <Chip
                        color="danger"
                        variant="solid"
                        size="sm"
                        className="absolute top-3 right-3 font-bold"
                    >
                        -{product.discount}
                    </Chip>
                )}
            </CardHeader>

            <CardBody className="p-5">
                <div className="flex items-center justify-between mb-2">
                    <Chip size="sm" variant="flat" color="default">
                        {product.platform}
                    </Chip>
                    <div className="flex items-center space-x-1">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {product.rating}
                        </span>
                    </div>
                </div>

                <h3 className="font-bold text-lg leading-tight mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                    {product.title}
                </h3>

                <div className="flex items-baseline space-x-2 mt-4">
                    <span className="text-2xl font-bold text-primary">
                        ¥{formatPrice(product.currentPrice)}
                    </span>
                    <span className="text-sm text-gray-400 line-through">
                        ¥{formatPrice(product.originalPrice)}
                    </span>
                </div>
            </CardBody>

            <CardFooter className="p-5 pt-0 gap-3">
                <Button
                    as="a"
                    href={product.url}
                    color="primary"
                    variant="solid"
                    size="sm"
                    className="flex-1"
                    endContent={<ExternalLink className="w-3.5 h-3.5" />}
                >
                    詳細を見る
                </Button>
                <Button
                    variant="bordered"
                    size="sm"
                    className="flex-1"
                >
                    比較する
                </Button>
            </CardFooter>
        </Card>
    );
}
