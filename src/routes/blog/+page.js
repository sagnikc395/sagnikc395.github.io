/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unused-vars */
export async function load({ fetch }) {
	const allPosts = import.meta.glob('./_posts/*.md');
	const posts = await Promise.all(
		Object.entries(allPosts).map(async ([path, resolver]) => {
			// @ts-expect-error
			const { metadata } = await resolver();
			// @ts-ignore
			const slug = path.split('/').pop().replace('.md', '');
			return { slug, ...metadata };
		})
	);
	return { posts };
}
