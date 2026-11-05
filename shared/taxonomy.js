export const AUDIENCES = ['Women', 'Men', 'Kids'];
export const PRODUCT_CATEGORIES = ['Dresses', 'Footwear', 'Accessories'];
export const DRESS_STYLES = ['Bridal', 'Ethnic', 'Casual', 'Party', 'Groom', 'Office', 'Beachy', 'Intimates / Innerwear'];
export const INTIMATES = 'Intimates / Innerwear';
export const SUBCATEGORIES = {
  Dresses: DRESS_STYLES,
  Footwear: ['Heels', 'Flats', 'Sneakers', 'Sandals', 'Boots', 'Formal Shoes'],
  Accessories: ['Bags', 'Jewellery', 'Watches', 'Sunglasses', 'Belts', 'Scarves'],
};

export const isIntimate = (p) => p?.subCategory === INTIMATES;
