import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SeoProps {
	title: string;
	ogTitle?: string | null;
	description: string;
}

const Seo: React.FC<SeoProps> = ({ title, ogTitle, description }) => {
	return (
		<Helmet>
			<title>{title}</title>
			<meta name="description" content={description} />
			<meta property="og:title" content={ogTitle ?? title} />
			<meta property="og:description" content={description} />
			<meta property="og:image" content="https://sagnikc395.github.io/assets/images/profile.jpeg" />
			<meta name="twitter:card" content="summary_large_image" />
		</Helmet>
	);
};

export default Seo;
