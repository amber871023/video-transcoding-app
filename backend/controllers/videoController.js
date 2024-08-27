const Video = require('../models/Video');
const ffmpeg = require('fluent-ffmpeg');

exports.uploadVideo = (req, res) => {
  const newVideo = new Video({
    title: req.body.title,
    description: req.body.description,
    originalVideoPath: req.file.path,
    owner: req.user.id // Assuming req.user is populated from the JWT middleware
  });
  newVideo.save()
    .then(video => res.json(video))
    .catch(err => res.status(400).json(err));
};

exports.transcodeVideo = (req, res) => {
  const videoId = req.body.videoId;
  Video.findById(videoId)
    .then(video => {
      ffmpeg(video.originalVideoPath)
        .output(video.originalVideoPath.replace(/\.([^\.]+)$/, '-transcoded.mp4'))
        .on('end', () => {
          video.transcodedVideoPath = video.originalVideoPath.replace(/\.([^\.]+)$/, '-transcoded.mp4');
          video.save().then(() => res.json({ message: 'Transcoding completed' }));
        })
        .on('error', err => res.status(500).json(err))
        .run();
    })
    .catch(err => res.status(400).json(err));
};

exports.downloadVideo = (req, res) => {
  Video.findById(req.params.id)
    .then(video => {
      res.download(video.transcodedVideoPath);
    })
    .catch(err => res.status(400).json(err));
};
