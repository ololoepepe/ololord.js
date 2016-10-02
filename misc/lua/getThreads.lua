local boardName = ARGV[1]
local threadsPerPage = ARGV[2]
local pageNumber = ARGV[3]

local startIndex = (pageNumber * threadsPerPage) + 1
local endIndex = startIndex + threadsPerPage - 1

local function comp(p1, p2)
  return (p1.updatedAt > p2.updatedAt)
end

local threadNumbers = redis.call('hkeys', 'threads:' .. boardName)
local updateTimes = redis.call('hmget', 'threadUpdateTimes:' .. boardName, unpack(threadNumbers))
pairs = {}
for i = 1, #threadNumbers do
  table.insert(pairs, i, { threadNumber = threadNumbers[i], updatedAt = updateTimes[i] })
end

table.sort(pairs, comp)
if (endIndex > table.getn(pairs)) then
  endIndex = table.getn(pairs)
end
threadNumbers = {}
for i = startIndex, endIndex do
  table.insert(threadNumbers, pairs[i].threadNumber)
end

local threads = redis.call('hmget', 'threads:' .. boardName, unpack(threadNumbers))
for i = 1, #threads do
  local thread = cjson.decode(threads[i])
  thread.updatedAt = pairs[i].updatedAt
  thread.postNumbers = redis.call('smembers', 'threadPostNumbers:' .. boardName .. ':' .. thread.number)
  for j = 1, #thread.postNumbers do
    thread.postNumbers[j] = tonumber(thread.postNumbers[j])
  end
  thread = cjson.encode(thread)
  threads[i] = thread
end

return threads
