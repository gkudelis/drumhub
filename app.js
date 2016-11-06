$(function() {
    var context = new (window.AudioContext || window.webkitAudioContext);

    var githubFetch = $.get('https://api.github.com/repos/gkudelis/drumhub/commits');
    var bufferLoad = loadBuffers();

    $.when(githubFetch, bufferLoad)
        .then(function(repository, buffers) {
            var sources = makeSources(buffers);
            var drumshot = sources[0];

            var commitTiming = repository[0].reverse().map(function(commitData) {
                return Date.parse(commitData.commit.author.date) / 1000;
            });
            var repoStart = commitTiming.reduce(function(acc, time) {
                return time < acc ? time : acc;
            }, Date.now());
            var repoEnd = commitTiming.reduce(function(acc, time) {
                return time > acc ? time : acc;
            }, 0);
            var relativeTiming = commitTiming.map(function(time) {
                return time - repoStart;
            });

            console.log(repoStart);
            console.log(repoEnd);
            console.log(relativeTiming);
        }, function(error) {
            console.log(error);
        });

    function loadBuffers() {
        var bufferPromise = $.Deferred();
        var bufferLoader = new BufferLoader(context, [
                'samples/drumshot.wav',
                'samples/crashcymbal.wav'
                ], function(buffers) { bufferPromise.resolve(buffers) });
        bufferLoader.load();
        return bufferPromise;
    }

    function makeSources(buffers) {
        return buffers.map(function(buffer) {
            var source = context.createBufferSource();
            source.buffer = buffer;
            source.connect(context.destination);
            return source;
        });
    }
});
