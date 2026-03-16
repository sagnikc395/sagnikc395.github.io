---
title: muzik - an way to do ranked music rating with friends
date: 2026-02-12
lead: given an music stream , this is a way to do ranked music rating and streaming with your friends.
topics: [nextjs, typescript, websockets, postgresql, redis]
image:
subimages:
---

# motivation

rating and discovering music is something that's always more fun with friends. but most music platforms are built around individual listening -- there's no easy way to collectively rank songs, debate what's actually good, and build a shared taste profile with your group.

i wanted a way where a group of friends could listen to the same stream, rate tracks in real time, and see a ranked leaderboard of what the group actually likes -- not just what the algorithm thinks you should hear.

## solution

muzik is a real-time collaborative music rating app. you create or join a room with friends, a music stream plays for everyone, and each person rates the tracks as they come. ratings are aggregated into a live ranked leaderboard using an elo-style ranking system, so the group's collective taste emerges over time.

the app uses websockets for real-time sync across all listeners in a room, redis for managing session state and live leaderboards, and postgresql for persisting ratings and historical data. the frontend is built with nextjs and typescript.

ref: [muzik](https://github.com/sagnikc395/muzik)
