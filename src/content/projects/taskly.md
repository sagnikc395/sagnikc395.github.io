---
title: 'taskly: A Distributed Task Scheduler in Go'
description: Taskly is an attempt to write an Distributed Task Scheduler in Go to improve per process performance for tasks.
publishDate: 'May 11 2024'
---

You can view the source of the code here : [Github](https://github.com/sagnikc395/taskly)

Creating a task scheduler involves understanding key theoretical concepts in software development, including concurrency, scheduling algorithms, time management, and system reliability.
Main Concepts in this regard :

### Concurrency and Parallelism

At the heart of any task scheduler is concurrency—handling multiple tasks that can execute simultaneously or independently of each other.

### Concurrency

Involves executing multiple tasks or processes in overlapping time periods but not necessarily at the same time. It’s especially important when scheduling tasks, as it allows multiple tasks to wait for their turn to execute while others are being processed.

### Parallelism

True simultaneous execution of tasks, typically on a multi-core system. In Go, the use of goroutines (lightweight threads) and channels make both concurrency and parallelism easy to implement.

Goroutines allow multiple tasks to run asynchronously, and channels are used for safe communication between these concurrently running tasks. This combination of concurrency and parallelism is vital in designing an efficient scheduler.

### Scheduling Algorithms

A task scheduler's job is to determine when and how tasks should run. There are various algorithms you can adopt depending on the requirements:

1. Round-Robin Scheduling: This is one of the simplest scheduling algorithms, where each task is given equal time to run in a cyclic order. It’s suitable for time-sharing systems where all tasks are equally important.

2. Priority Scheduling: Tasks are assigned different priorities. Higher-priority tasks are executed first, and lower-priority tasks are delayed until all higher-priority ones finish. This method is useful in systems where some tasks need to be handled urgently.

3. Rate Monotonic Scheduling (RMS): A type of real-time scheduling where tasks are assigned priority based on their periodicity (how frequently they need to run). The shorter the period, the higher the priority.

4. Earliest Deadline First (EDF): Here, tasks are scheduled based on their deadlines. The task with the nearest deadline is executed first, which is ideal for real-time systems requiring precise timing.

When designing your task scheduler, choosing a suitable algorithm depends on the nature of the tasks. Go’s goroutines and channels can be used to implement these scheduling strategies.

### Timing and Synchronization

Task scheduling relies heavily on accurate timing and synchronization mechanisms. In Go, the time package provides tools such as Ticker, Timer, and Sleep to control the intervals at which tasks are executed.

### Tickers

Send events at regular intervals, making them ideal for recurring tasks.

### Timers

Trigger events after a specified duration, useful for one-time scheduled events.

However, timing is not always perfectly reliable in real-world systems due to hardware limits, OS scheduling, and delays in task execution, especially if multiple tasks are competing for CPU resources. You might need to consider compensating for drift or jitter in task execution.

### Task Isolation and Failure Handling

When scheduling tasks, it’s important to ensure that one task's failure doesn’t crash the entire system. This concept is referred to as task isolation.

Panic and Recover: In Go, if a goroutine panics (encounters a runtime error), it may terminate unexpectedly. Using defer, panic, and recover functions, you can isolate failing tasks and allow the scheduler to continue executing other tasks even after one fails.

```go

defer func() {
if r := recover(); r != nil {
fmt.Println("Recovered from task failure:", r)
}
}()
```

This helps build fault-tolerant systems where task failures are expected and handled gracefully.

### Task Queuing and Throttling

For long-running or heavy tasks, scheduling may involve task queuing and throttling. Queuing ensures tasks are executed in the order they arrive, while throttling ensures that the system isn’t overwhelmed by too many tasks at once.

### Queues

Task queues hold tasks until the system is ready to execute them. You can implement a basic task queue using Go channels. Tasks are pushed into the channel, and workers (goroutines) pull from the queue and execute them.

### Throttling

Limiting the number of tasks executed concurrently can prevent system overload. You can use worker pools, where a limited number of goroutines pick up tasks from the queue.

```go

taskQueue := make(chan Task, 10)
	for i := 0; i < 5; i++ { // 5 workers
	go worker(taskQueue)
}

func worker(queue <-chan Task) {
	for task := range queue {
		task.Execute()
	}
}
```

### Deadlines and Timeouts

Real-world systems need to handle tasks that may take too long to execute, which is where deadlines and timeouts become essential.

### Timeouts

Ensure that if a task doesn’t complete within a certain time, it is canceled or retried. This is done using the context package in Go, which allows you to manage timeouts and cancellation signals in a structured way.

```go
ctx, cancel := context.WithTimeout(context.Background(), 5\*time.Second)
	defer cancel()

select {
case <-ctx.Done():
	fmt.Println("Task canceled due to timeout")
case result := <-taskChannel:
	fmt.Println("Task completed with result:", result)
}

```

### Deadlines

Work similarly to timeouts but provide a hard limit on task completion. You set a specific deadline, after which the task is canceled if not finished. 7. Task Scheduling in Distributed Systems
If you’re building a distributed system, task scheduling must consider network latency, system failures, and the possibility of distributed nodes not being in sync.

### Leader Election

In distributed scheduling, having a single leader node to coordinate task assignment helps maintain a unified task schedule across multiple nodes. Go libraries like etcd or consul can help with leader election and distributed synchronization.

### Distributed Task Queues

In large-scale systems, task queues might be distributed across multiple machines or services. Solutions like Redis or Kafka can be used for building distributed task queues to handle this scenario.

## Conclusion

Building a task scheduler in Go is more than just coding the mechanics of running tasks; it requires a deep understanding of concurrency, scheduling algorithms, time management, and failure handling. Go’s concurrency model and built-in packages like time, context, and sync make it an excellent language for implementing these systems efficiently. With the right theoretical background, you can design a robust, scalable task scheduler tailored to your specific application requirements.
