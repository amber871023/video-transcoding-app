import React, { useEffect, useState, useCallback } from 'react';
import { Box, Text, Button, VStack, HStack, useToast, Container, Image, Stack } from '@chakra-ui/react';
import { useDropzone } from 'react-dropzone';
import { FaFileUpload, FaExchangeAlt, FaDownload } from 'react-icons/fa';
import CustomButton from '../components/CustomButton';

const VideoPage = () => {
  const [videos, setVideos] = useState([]);
  const [playingVideoId, setPlayingVideoId] = useState(null); // State to track the currently playing video
  const toast = useToast();

  const onDrop = useCallback((acceptedFiles) => {
    // Handle file upload
    console.log(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  useEffect(() => {
    // Fake video data for testing purposes
    const fakeVideos = [
      {
        _id: '1',
        originalName: 'Video1.mp4',
        size: 150,
        duration: '3:45',
        format: 'MP4',
        thumbnail: 'https://via.placeholder.com/150?text=Video+1', // Example placeholder image URL
        videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', // Replace with the actual video URL
      },
      {
        _id: '2',
        originalName: 'Video2.avi',
        size: 200,
        duration: '5:20',
        format: 'AVI',
        thumbnail: 'https://via.placeholder.com/150?text=Video+2',
        videoUrl: 'https://www.example.com/video2.avi', // Replace with the actual video URL
      },
      {
        _id: '3',
        originalName: 'Video3.mov',
        size: 350,
        duration: '10:10',
        format: 'MOV',
        thumbnail: 'https://via.placeholder.com/150?text=Video+3',
        videoUrl: 'https://www.example.com/video3.mov', // Replace with the actual video URL
      },
    ];

    // Simulate an API call
    setTimeout(() => {
      setVideos(fakeVideos);
    }, 1000);
  }, []);

  const handleReformat = async (videoId) => {
    try {
      // Simulate reformatting logic
      toast({
        title: 'Video reformatted successfully.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error reformatting video.',
        description: 'Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDownload = (videoId) => {
    // Simulate file download
    toast({
      title: 'Download started.',
      description: `Downloading video with ID: ${videoId}`,
      status: 'info',
      duration: 5000,
      isClosable: true,
    });
  };

  const handlePlayVideo = (videoId) => {
    setPlayingVideoId(videoId);
  };

  return (
    <Box bg="gray.50" minH="100vh" p={8}>
      <Container maxW="container.lg" pt={10} pb={20}>
        <Text textAlign={"center"} fontSize={{ base: "xl", md: "2xl" }} fontWeight={"bold"} mb={6}>
          Your Uploaded Videos:
        </Text>
        <VStack spacing={4}>
          {videos.length === 0 ? (
            <Box
              background={"gray.200"} rounded={10} px={'150px'} py={10}
              textAlign="center"
              borderWidth="4px"
              borderColor={isDragActive ? "purple.500" : "gray.300"}
              borderStyle={isDragActive ? "solid" : "dashed"}
              {...getRootProps()}
            >
              <input {...getInputProps()} />
              <Text fontSize="lg" fontWeight="medium" mb={2}>
                You have no video upload records yet.
              </Text>
              <Button leftIcon={<FaFileUpload />} bg="#39349c"
                color="white"
                _hover={{ bg: "#151257" }}
                _active={{ bg: "#151257" }}
                boxShadow="xl" size="lg">
                Upload Files?
              </Button>
            </Box>
          ) : (
            <VStack spacing={4} width={{ base: "100%", md: "100%" }}>
              {videos.map((video) => (
                <Box key={video._id} p={4} shadow="md" borderWidth="1px" borderRadius="md" width="100%" background={'gray.100'}>
                  <Stack
                    direction={playingVideoId === video._id ? 'column' : { base: 'column', md: 'row' }}

                    alignItems={playingVideoId === video._id ? 'center' : 'start'}
                    spacing={4}
                  >
                    {playingVideoId === video._id ? (
                      <video
                        src={video.videoUrl}
                        controls
                        autoPlay
                        style={{ borderRadius: 'md', width: '100%' }}
                      />
                    ) : (
                      <Image
                        src={video.thumbnail}
                        alt={video.originalName}
                        boxSize={{ base: "100%", md: "250px" }}
                        objectFit="cover"
                        borderRadius="md"
                        onClick={() => handlePlayVideo(video._id)}
                        cursor="pointer"
                      />
                    )}
                    <VStack align={"start"} spacing={4}>
                      <Text fontWeight="bold" fontSize={{ base: "md", md: "lg" }}>{video.originalName}</Text>
                      <Text fontSize={{ base: "sm", md: "md" }}>Size: {video.size} MB</Text>
                      <Text fontSize={{ base: "sm", md: "md" }}>Duration: {video.duration}</Text>
                      <Text fontSize={{ base: "sm", md: "md" }}>File Type: {video.format}</Text>
                      <HStack spacing={4} pt={{ base: 2, md: 0 }}>
                        <CustomButton leftIcon={FaExchangeAlt} size="md" bg="blue.400" boxShadow={"lg"} onClick={() => handleReformat(video._id)}>
                          Reformat
                        </CustomButton>
                        <CustomButton leftIcon={FaDownload} size="md" onClick={() => handleDownload(video._id)}>
                          Download
                        </CustomButton>
                      </HStack>
                    </VStack>
                  </Stack>
                </Box>
              ))}
            </VStack>
          )}
        </VStack>
      </Container>
    </Box>
  );
};

export default VideoPage;
