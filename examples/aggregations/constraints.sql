-- These constraints enforce some of what we know must be true about
-- aggregations. The can be loaded into a schema (aftre replacing the
-- sgdNNN with the correct one) and will stop indexing as soon as one of
-- these constraints doesn't hold true.

alter table sgd85.stats_hour
  add constraint stats_hour_min_first
    check (min = first);
alter table sgd85.stats_hour
  add constraint stats_hour_max_last
    check (max = last);
alter table sgd85.stats_hour
  add constraint stats_hour_sum
    check (sum = (max - min + 1)*(max + min)/2);
alter table sgd85.stats_day
  add constraint stats_day_min_first
    check (min = first);
alter table sgd85.stats_day
  add constraint stats_day_max_last
    check (max = last);
alter table sgd85.stats_day
  add constraint stats_day_sum
    check (sum = (max - min + 1)*(max + min)/2);
alter table sgd85.group_1_hour
  add constraint group_1_hour_first_last
    check (first <= last);
alter table sgd85.group_2_hour
  add constraint group_2_hour_first_last
    check (first <= last);
alter table sgd85.group_3_hour
  add constraint group_3_hour_first_last
    check (first <= last);
alter table sgd85.groups_hour
  add constraint groups_hour_first_last
    check (first <= last);

-- Cumulative checks
alter table sgd85.groups_hour
  add constraint groups_hour_total_min_max
    check (total_min = group_3
      and  total_max = max
      and  total_first = group_3
      and  total_last = max);
alter table sgd85.groups_hour
  add constraint groups_hour_total_count_sum
    check (total_sum
           = total_count * (group_3 + 1000*(total_count::numeric-1)/2));