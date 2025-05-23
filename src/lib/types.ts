export type Blog = {
	title: string;
	date: Date;
	summary: string;
	link?: string;
};

export type Project = {
	title: string;
	date: string;
	content: string;
	repo: string;
	topics: string[];
	lead: string;
	image: string;
	image_border?: boolean;
	subimages?: string[];
};
