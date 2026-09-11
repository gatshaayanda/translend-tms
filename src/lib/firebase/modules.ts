// =============================================================
// Module repositories — thin, named wrappers around the generic
// repository factory. One export per business collection.
// =============================================================
// Deliberately kept in one file: each repo is 1-2 lines, and this
// is the map of "every collection that exists in this app" that
// new contributors should read first.

import { createRepository } from "./repository";
import type { Customer, Truck, Driver, Job, Trip, Delivery } from "@/types/core";

export const customersRepo = createRepository<Customer>("customers");
export const trucksRepo = createRepository<Truck>("trucks");
export const driversRepo = createRepository<Driver>("drivers");
export const jobsRepo = createRepository<Job>("jobs");
export const tripsRepo = createRepository<Trip>("trips");
export const deliveriesRepo = createRepository<Delivery>("deliveries");
