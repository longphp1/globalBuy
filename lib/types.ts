export type MenuItem = {
  name: string;
  url: string;
};

export type Product = {
  id: number;
  slug: string;
  name: string;
  price: string;
  brand: string;
  menuName: string;
  menuUrl: string;
  image: string;
  sourceProductId: string;
  sourceProductUrl: string;
  taoBuyLink: string;
};

export type SiteCatalog = {
  menus: MenuItem[];
  products: Product[];
};

export type Site = {
  slug: string;
  name: string;
  url: string;
  title: string;
  siteId: string;
};

export type Catalog = {
  pageSize: number;
  generatedAt: string;
  catalogs: Record<string, SiteCatalog>;
  sites: Site[];
};

export type PlatformLink = {
  name: string;
  letter: string;
  logo: string;
  href: string;
  recommended?: boolean;
};
