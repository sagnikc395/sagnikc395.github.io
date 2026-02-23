import React, { useEffect } from 'react';
import Seo from '../lib/components/Seo';

const Home: React.FC = () => {
	useEffect(() => {
		const script = document.createElement('script');
		script.id = 'umaring_js';
		script.src = 'https://umaring.mkr.cx/ring.js?id=sagnikc395';
		script.async = true;
		document.body.appendChild(script);

		return () => {
			const existingScript = document.getElementById('umaring_js');
			if (existingScript) {
				existingScript.remove();
			}
		};
	}, []);

	return (
		<>
			<Seo
				title="Sagnik Chatterjee"
				description="Software engineer, researcher interested in program synthesis."
			/>

			<p
				className="layout-md text-stone-500 text-xl md:text-lg leading-tight font-light mb-16 p-2 max-[420px]:-mt-10"
				id="sagnik-is"
			>
				<span className="neutral">is a</span>
				software engineer<span className="neutral">, ai fanboy </span>
				<br />
				and researcher<span className="neutral"></span>
				<br />
			</p>

			<div className="layout-md text-lg md:text-xl space-y-14 max-w-4xl mx-auto">
				{/* hero */}
				<div className="flex flex-col md:flex-row items-center md:items-start space-y-10 md:space-y-0 md:space-x-10">
					{/* Profile Image */}
					<div
						className="w-full md:w-1/3 flex justify-center items-center md:justify-start"
						style={{ alignSelf: 'stretch' }}
					>
						<img
							alt="sagnik chilling in his natural place"
							src="/assets/images/profile2.jpeg"
							className="rounded-xl w-64 object-cover"
						/>
					</div>

					{/* Text Content */}
					<div className="w-full md:w-2/3 space-y-5">
						<p className="text-xl font-semibold">Hi, I’m Sagnik 👋</p>
						<p className="text-lg md:text-xl">
							I’m primarily interested in natural language processing and biomedical applications, with a
							focus on building knowledge models tailored for real-world biomedical use cases. Along the
							way, I’m also curious about how these systems intersect with program synthesis and broader
							AI reasoning.
						</p>
						<p>
							After sunset, you’ll usually find me nose-deep in a history book—anything from ancient
							empires to modern revolutions. If I’m not reading, I’m probably out chasing pavement on a
							long run, clearing my head one mile at a time. I’ve got a soft spot for brutal workouts and
							quiet routines, and I genuinely believe a good sweat can fix almost anything. Weekends are
							for recharging: wandering through random Wikipedia rabbit holes, meal-prepping like a monk,
							or just planning my next read.
						</p>
					</div>
				</div>

				<div className="text-center space-y-4">
					<h2 className="text-xl md:text-2xl font-semibold underline text-stone-100">Some things I believe in:</h2>
					<ul className="list-inside space-y-1 text-stone-400">
						<li>Complexity is often just poor organization.</li>
						<li>Mastery begins where imitation ends.</li>
						<li>Clarity is speed disguised as patience.</li>
						<li>Curiosity scales better than discipline.</li>
						<li>Abstractions are escape hatches, not destinations.</li>
						<li>You don’t need permission to be excellent.</li>
						<li>The best optimizations start with deletion.</li>
						<li>Most truths are discovered backwards.</li>
						<li>Tools shape thought—choose wisely.</li>
						<li>Nothing works until it works with people.</li>
						<li>Fundamentally, every bottleneck is a skill issue.</li>
					</ul>
				</div>

				<div className="flex flex-col items-center space-y-6">
					<p className="text-center text-lg md:text-xl">
						I'm also building a digital garden of my knowledge base and unfinished writings <br />
						Follow here:
						<a
							href="https://sc4-knowledge-base.vercel.app/"
							className="underline italic"
							rel="noreferrer"
							target="_blank"
						>
							sagnik's digital garden
						</a>
					</p>

					<div className="bg-[#881c1c] p-[15px] rounded-[12px] inline-block shadow-[0_4px_15px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-in-out border-2 border-[#5e1414] font-sans hover:translate-y-[-5px] hover:shadow-[0_8px_25px_rgba(136,28,28,0.3)]">
						<div id="umaring" className="text-white !no-underline font-bold"></div>
					</div>
				</div>

				<hr className="border-stone-800" />
				{/* other stuff that interests me */}
				<div className="text-center text-stone-200 pb-10">
					<p>Other interests: endurance running, F1, making sketches.</p>
				</div>
			</div>
		</>
	);
};

export default Home;
