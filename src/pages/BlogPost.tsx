import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Seo from '../lib/components/Seo';
import Markdown from '../lib/components/Markdown';
import { formatTime } from '../lib/utils';

const BlogPost: React.FC = () => {
	const { slug } = useParams<{ slug: string }>();
	const navigate = useNavigate();
	const [post, setPost] = useState<any>(null);

	useEffect(() => {
		const loadPost = async () => {
			try {
				const posts = import.meta.glob('../posts/*.md');
				const path = `../posts/${slug}.md`;
				if (posts[path]) {
					const data: any = await posts[path]();
					const postData = data.default || data;
					if (postData.draft) {
						navigate('/404');
						return;
					}
					setPost(postData);
				} else {
					navigate('/404');
				}
			} catch (e) {
				console.error(e);
				navigate('/404');
			}
		};
		loadPost();
	}, [slug, navigate]);

	if (!post) return null;

	return (
		<>
			<Seo title={post.title} description={`Blog post: ${post.title}`} />

			<article className="layout-md py-10">
				<header className="mb-8">
					<h1 className="text-3xl font-bold mb-2 text-stone-100">{post.title}</h1>
					<div className="text-stone-400">{formatTime('%d %B %Y', post.date)}</div>
				</header>

				{post.image && (
					<img src={post.image} alt={post.title} className="w-full rounded-lg mb-8 shadow-md" />
				)}

				<div className="prose prose-stone prose-invert prose-headings:font-semibold prose-headings:text-stone-100 prose-p:text-stone-300 prose-a:text-blue-600 hover:prose-a:text-blue-800 max-w-none">
					<Markdown source={post.content} />
				</div>
			</article>
		</>
	);
};

export default BlogPost;
