import { Response } from 'express';
import { AuthRequest } from '../types';
import { param } from '../utils/params';

interface OpenFoodFactsProduct {
	product_name?: string;
	brands?: string;
	image_url?: string;
	categories_tags?: string[];
	quantity?: string;
}

interface OpenFoodFactsResponse {
	status: number;
	product?: OpenFoodFactsProduct;
}

export const lookupBarcode = async (req: AuthRequest, res: Response): Promise<void> => {
	try {
		const barcode = param(req.params.barcode);

		if (!barcode || !/^\d{8,14}$/.test(barcode)) {
			res.status(400).json({ error: 'Invalid barcode format' });
			return;
		}

		const response = await fetch(
			`https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=product_name,brands,image_url,categories_tags,quantity`
		);

		if (!response.ok) {
			res.status(502).json({ error: 'Failed to reach product database' });
			return;
		}

		const data = await response.json() as OpenFoodFactsResponse;

		if (data.status === 0 || !data.product) {
			res.status(404).json({ error: 'Product not found', barcode });
			return;
		}

		const product = data.product;
		const rawCategory = product.categories_tags?.[0]?.replace('en:', '') ?? null;
		const category = rawCategory
			? rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1).replace(/-/g, ' ')
			: null;

		res.json({
			barcode,
			name: product.product_name || null,
			brand: product.brands || null,
			imageUrl: product.image_url || null,
			category,
			quantity: product.quantity || null,
		});
	} catch {
		res.status(500).json({ error: 'Internal server error' });
	}
};
