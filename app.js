$(function() {
    var context = new (window.AudioContext || window.webkitAudioContext);

    var bufferLoad = loadBuffers();
    var allSources = [];

    $("#load-new").click(function() {
        allSources.map(function(source) { source.disconnect() });
        allSources = [];
        playRepo('https://api.github.com/repos/airbnb/knowledge-repo/commits');
    });

    //var githubFetch = $.get('https://api.github.com/repos/airbnb/knowledge-repo/commits');

    function playRepo(repo) {
        $.when($.get(repo), bufferLoad)
            .then(function(repository, buffers) {
                var drumshot = buffers[0];
                var crashcymbal = buffers[1];
                var tomtom = buffers[2];

                var commitTiming = repository[0].reverse().map(function(commitData) {
                    return Date.parse(commitData.commit.author.date) / 1000;
                }).sort();
                var repoStart = commitTiming.reduce(function(acc, time) {
                    return time < acc ? time : acc;
                }, Infinity);
                var repoEnd = commitTiming.reduce(function(acc, time) {
                    return time > acc ? time : acc;
                }, 0);
                var repoDuration = repoEnd - repoStart;
                var relativeTiming = commitTiming.map(function(time) {
                    return time - repoStart;
                });

                console.log(repoStart);
                console.log(repoEnd);
                console.log(repoDuration);
                console.log(relativeTiming);

                // measure the shortest space between commits
                var shortestPeriod = Infinity;
                for (var i = 0; i < relativeTiming.length-1; i++) {
                    var period = relativeTiming[i+1] - relativeTiming[i];
                    shortestPeriod = period < shortestPeriod ? period : shortestPeriod;
                }

                // drop BPM by no more than 10x
                var scaling = timeScalingFactory(0.5, 10, 0.00001, shortestPeriod);

                // create drum timings with all the scaling done
                var beatStart = context.currentTime;
                var drumTimings = [];
                for (var i = 0; i < relativeTiming.length-1; i++) {
                    var period = scaling(relativeTiming[i+1] - relativeTiming[i]);

                    var periodU = relativeTiming[i+1] - relativeTiming[i];
                    var lastPeriodU = relativeTiming[i] - relativeTiming[i-1];
                    var lastLastPeriodU = relativeTiming[i-1] - relativeTiming[i-2];
                    var firstBuffer = drumshot;
                    if (i > 1) {
                        if (lastLastPeriodU > lastPeriodU && lastPeriodU < periodU) {
                            firstBuffer = crashcymbal;
                        } else if (lastLastPeriodU < lastPeriodU && lastPeriodU > periodU) {
                            firstBuffer = tomtom;
                        }
                    }

                    drumTimings.push({
                            buffer: firstBuffer,
                            time: beatStart + 0 * period
                        });
                    drumTimings.push({
                            buffer: drumshot,
                            time: beatStart + 0.25 * period
                        });
                    drumTimings.push({
                            buffer: drumshot,
                            time: beatStart + 0.5 * period
                        });
                    drumTimings.push({
                            buffer: drumshot,
                            time: beatStart + 0.75 * period
                        });

                    beatStart += period;
                }

                console.log(drumTimings);
                drumTimings.map(function(t) {
                    playSound(t.buffer, t.time)
                });
            }, function(error) {
                console.log(error);
            });
    }

    function timeScalingFactory(A, v, k, tmin) {
        return function(t) { return v*A - (v-1)*A* Math.exp(-k*(t-tmin)) }
    }

    function loadBuffers() {
        var bufferPromise = $.Deferred();
        var bufferLoader = new BufferLoader(context, [
                'samples/drumshot.wav',
                'samples/crashcymbal.wav',
                'samples/tomtom.wav'
                ], function(buffers) { bufferPromise.resolve(buffers) });
        bufferLoader.load();
        return bufferPromise;
    }

    function playSound(buffer, time) {
        var source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(time);
        allSources.push(source);
    }
});
