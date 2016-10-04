local boardName = ARGV[1]
local threadsPerPage = ARGV[2]
local pageNumber = ARGV[3]

local startIndex = (pageNumber * threadsPerPage) + 1
local endIndex = startIndex + threadsPerPage - 1

local function comp(p1, p2)
  if ((not (not p1.fixed)) == (not (not p2.fixed))) then
    return (p1.updatedAt > p2.updatedAt)
  else
    if (p1.fixed) then
      return true
    else
      return false
    end
  end
end

local threadNumbers = redis.call('hkeys', 'threads:' .. boardName)
local updateTimes = redis.call('hmget', 'threadUpdateTimes:' .. boardName, unpack(threadNumbers))
local fixedFlags = redis.call('hmget', 'threadFixedFlags:' .. boardName, unpack(threadNumbers))
local list = {}
for i = 1, #threadNumbers do
  table.insert(list, i, { threadNumber = threadNumbers[i], updatedAt = updateTimes[i], fixed = fixedFlags[i] })
end

table.sort(list, comp)
if (endIndex > table.getn(list)) then
  endIndex = table.getn(list)
end
threadNumbers = {}
for i = startIndex, endIndex do
  table.insert(threadNumbers, list[i].threadNumber)
end

local threads = redis.call('hmget', 'threads:' .. boardName, unpack(threadNumbers))
for i = 1, #threads do
  local thread = cjson.decode(threads[i])
  thread.updatedAt = list[i].updatedAt
  thread.fixed = list[i].fixed
  thread.postNumbers = redis.call('smembers', 'threadPostNumbers:' .. boardName .. ':' .. thread.number)
  for j = 1, #thread.postNumbers do
    thread.postNumbers[j] = tonumber(thread.postNumbers[j])
  end
  thread = cjson.encode(thread)
  threads[i] = thread
end

return threads
