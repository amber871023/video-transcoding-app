import React, { useEffect, useState } from 'react';
import {
  Box, Text, Button, VStack, HStack, useToast, Container, Image, Stack,
  IconButton, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader,
  AlertDialogContent, AlertDialogOverlay, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalFooter, ModalBody, ModalCloseButton, Select, CircularProgress, CircularProgressLabel
} from '@chakra-ui/react';
import { FaHome, FaExchangeAlt, FaDownload, FaTrash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import CustomButton from '../components/CustomButton';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const formatDuration = (durationInSeconds) => {
  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = Math.floor(durationInSeconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// const baseUrl = "http://localhost:3001";
const baseUrl = "http://group50.cab432.com:3001";

const VideoPage = () => {
  const [videos, setVideos] = useState([]);
  const [playingVideoId, setPlayingVideoId] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState(null);
  const [isReformatOpen, setIsReformatOpen] = useState(false);
  const [format, setFormat] = useState('MP4');
  const [videoToReformat, setVideoToReformat] = useState(undefined);
  const [conversionProgress, setConversionProgress] = useState({});
  const cancelRef = React.useRef();
  const toast = useToast();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const fetchVideos = async () => {
    try {
      const token = localStorage.getItem('idToken');
      const response = await axios.get(`${baseUrl}/videos/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const videosWithUrls = response.data.map(video => ({
        ...video,
        videoUrl: video.originalVideoPath,
      }));
      setVideos(videosWithUrls);
    } catch (error) {
      toast({
        title: 'Error fetching videos.',
        description: 'Please try again later.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Automatically fetch videos when logged in or on page reload
  useEffect(() => {
    if (isLoggedIn) {
      fetchVideos();
    }
  }, [isLoggedIn]);

  const handleReformat = async () => {
    if (!videoToReformat) {
      console.error('Cannot reformat without a video ID.');
      return;
    }

    setConversionProgress((prev) => ({ ...prev, [videoToReformat]: 0 }));

    try {
      const formData = new FormData();
      formData.append('videoId', videoToReformat);
      formData.append('format', format.toLowerCase());

      const response = await fetch(`${baseUrl}/videos/reformat/${videoToReformat}`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: true });
        const cleanedChunk = chunk.trim().replace(/^data:\s*/, '');
        const progress = Number(cleanedChunk);

        console.log('Progress received from server:', progress); // Add this log to see the progress

        if (!isNaN(progress) && progress > 0) {
          setConversionProgress((prev) => ({ ...prev, [videoToReformat]: progress }));

          if (progress >= 100) {
            toast({
              title: 'Video reformatted successfully.',
              status: 'success',
              duration: 5000,
              isClosable: true,
            });

            // Reset the state after successful conversion
            setConversionProgress((prev) => ({ ...prev, [videoToReformat]: undefined }));
            closeReformatDialog();
            await fetchVideos(); // Refresh the video list
          }
        }
      }

    } catch (error) {
      console.error('Error during reformat:', error.message);

      // Retry logic: Exponential Backoff
      if (
        error.message.includes('network error') ||
        error.message.includes('ERR_CONNECTION_REFUSED') ||
        error.message.includes('ERR_INCOMPLETE_CHUNKED_ENCODING')
      ) {
        toast({
          title: 'Connection Error',
          description: 'Failed to reformat the video. Connection is down.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });

        // Retry logic using exponential backoff
        let attempt = 1;
        const maxAttempts = 5;
        const retryInterval = setInterval(async () => {
          try {
            const healthResponse = await axios.get(`${baseUrl}/status`, { timeout: 5000 });

            if (healthResponse.status === 200) {
              clearInterval(retryInterval);
              toast({
                title: 'Backend Available',
                description: 'Backend is available. Retrying reformatting...',
                status: 'success',
                duration: 5000,
                isClosable: true,
              });

              await handleReformat(); // Retry reformatting
            }
          } catch (retryError) {
            console.log(`Attempt ${attempt} failed, retrying...`);
            if (attempt >= maxAttempts) {
              clearInterval(retryInterval);
              toast({
                title: 'Reformatting Failed',
                description: 'Maximum retry attempts reached. Please try again later.',
                status: 'error',
                duration: 5000,
                isClosable: true,
              });
            }
            attempt++;
          }
        }, Math.min(attempt * 2000, 10000)); // Exponential backoff with max 10 seconds delay
      }
    }
  };


  const handleDownload = async (videoId) => {
    try {
      const downloadUrl = `${baseUrl}/videos/download/${videoId}`;

      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download the video. Status: ${response.status}`);
      }

      // Extract filename from the Content-Disposition header, if available
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'downloaded_video'; // Default filename

      if (contentDisposition) {
        // Extract filename from the header using regex
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      // Convert the response to a Blob object
      const blob = await response.blob();
      const downloadLink = URL.createObjectURL(blob);

      // Create a temporary link element for download
      const link = document.createElement('a');
      link.href = downloadLink;
      link.setAttribute('download', filename); // Use the extracted or default filename
      document.body.appendChild(link);
      link.click();

      // Clean up the temporary link and revoke the object URL
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadLink);
    } catch (error) {
      toast({
        title: 'Download Error',
        description: 'Failed to download the video. Please try again later.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handlePlayVideo = (videoId) => {
    const video = videos.find(v => v.videoId === videoId);
    if (video && video.videoUrl) {
      setPlayingVideoId(videoId);
    } else {
      console.error('Video URL not found for ID:', videoId);
    }
  };

  const openDeleteDialog = (videoId) => {
    setVideoToDelete(videoId);
    setIsDeleteOpen(true);
  };

  const closeDeleteDialog = () => {
    setIsDeleteOpen(false);
    setVideoToDelete(undefined);
  };

  const handleDeleteVideo = async () => {
    try {
      await axios.delete(`${baseUrl}/videos/delete/${videoToDelete}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('idToken')}`,
        },
      });
      setVideos(videos.filter(video => video.videoId !== videoToDelete));
      toast({
        title: 'Video deleted successfully.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Error deleting video.',
        description: 'Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      closeDeleteDialog();
    }
  };

  const openReformatDialog = (videoId) => {
    setVideoToReformat(videoId);
    setIsReformatOpen(true);
  };

  const closeReformatDialog = () => {
    setIsReformatOpen(false);
    setVideoToReformat(undefined);
    setFormat('MP4');
  };

  return (
    <Box bg="gray.50" minH="84vh" p={8}>
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
              borderColor={"gray.300"}
              borderStyle="dashed"
            >
              <Text fontSize="lg" fontWeight="medium" mb={2}>
                You have no video upload records yet.
              </Text>
              <Button bg="#39349c"
                color="white"
                leftIcon={<FaHome />}
                _hover={{ bg: "#151257" }}
                _active={{ bg: "#151257" }}
                boxShadow="xl" size="lg"
                onClick={() => navigate('/')}
              >
                Go to Home
              </Button>
              <Text fontSize="sm" color="gray.500" mt={2}>
                Click to go back to the Home page to upload files
              </Text>
            </Box>
          ) : (
            <VStack spacing={4} width={{ base: "100%", md: "100%" }}>
              {videos.map((video) => {
                const convertedFormat = video.transcodedVideoPath
                  ? video.transcodedVideoPath.split('.').pop().slice(0, 3).toUpperCase()
                  : null;

                return (
                  <Box key={video.videoId} p={4} shadow="md" borderWidth="1px" borderRadius="md" width="100%" background={'gray.100'} position="relative">
                    <IconButton
                      icon={<FaTrash />}
                      color={"red.400"}
                      position="absolute"
                      top="10px"
                      right="10px"
                      onClick={() => openDeleteDialog(video.videoId)}
                    />
                    <Stack
                      direction={playingVideoId === video.videoId ? 'column' : { base: 'column', md: 'row' }}
                      alignItems={playingVideoId === video.videoId ? 'space-between' : 'space-between'}
                      spacing={4}
                    >
                      {playingVideoId === video.videoId ? (
                        <Box
                          width="100%"
                          maxWidth="600px"
                          borderRadius="8px"
                          overflow="hidden"
                          boxShadow="lg"
                        >
                          <video
                            src={video.transcodedVideoPath}
                            controls
                            autoPlay
                            style={{
                              width: '100%',
                              height: 'auto',
                              objectFit: 'contain'
                            }}
                            onError={(e) => console.error('Video playback error:', e)}
                          />
                        </Box>
                      ) : (
                        <Image
                          src={(video.thumbnailPath)}
                          alt={video.title}
                          boxSize={{ base: "100%", md: "250px" }}
                          maxH={"350px"}
                          objectFit="cover"
                          borderRadius="md"
                          onClick={() => handlePlayVideo(video.videoId)}
                          cursor="pointer"
                        />
                      )}
                      <Stack direction={playingVideoId === video.videoId ? { base: 'column', md: 'row' } : 'column'} align={"flex-start"} justifyContent={"space-between"}>
                        <VStack align={"flex-start"}>
                          <Text fontWeight="bold" fontSize={{ base: "md", md: "lg" }}>{video.title}</Text>
                          <Text fontSize={{ base: "sm", md: "md" }}>Size: {Math.round(video.size / 1024 / 1024)} MB</Text>
                          <Text fontSize={{ base: "sm", md: "md" }}>Duration: {formatDuration(video.duration)}</Text>
                          <Text fontSize={{ base: "sm", md: "md" }}>Original File Type: {video.format.toUpperCase()}</Text>
                          {convertedFormat && (
                            <Text fontSize={{ base: "sm", md: "md" }}>Converted File Type: {convertedFormat}</Text>
                          )}
                        </VStack>
                        <HStack spacing={4} pt={{ base: 2, md: 0 }} alignSelf={{ base: "center", md: "end" }}>
                          <CustomButton leftIcon={FaExchangeAlt} size="md" bg="blue.400" boxShadow={"lg"} onClick={() => openReformatDialog(video.videoId)}>
                            Reformat
                          </CustomButton>
                          <CustomButton leftIcon={FaDownload} size="md" onClick={() => handleDownload(video.videoId)}>
                            Download
                          </CustomButton>
                        </HStack>
                      </Stack>
                    </Stack>
                  </Box>
                );
              })}
            </VStack>
          )}
        </VStack>
      </Container>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen} isCentered
        leastDestructiveRef={cancelRef}
        onClose={closeDeleteDialog}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Video
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete this video? This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={closeDeleteDialog}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDeleteVideo} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Reformat Modal */}
      <Modal isOpen={isReformatOpen} onClose={closeReformatDialog} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Reformat Video</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>Select the format you want to convert the video to:</Text>
            <Select mt={4} value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="MP4">MP4</option>
              <option value="WEBM">WEBM</option>
              <option value="FLV">FLV</option>
              <option value="MOV">MOV</option>
              <option value="AVI">AVI</option>
              {/* <option value="WMV">WMV</option> */}
              <option value="MPEG">MPEG</option>
            </Select>
          </ModalBody>
          <ModalFooter>
            {conversionProgress[videoToReformat] !== undefined && conversionProgress[videoToReformat] < 100 ? (
              <Box width="150px" textAlign="center">
                <CircularProgress
                  value={conversionProgress[videoToReformat]}
                  color="blue.500"
                  size="50px"
                  thickness="10px"
                >
                  <CircularProgressLabel>{`${conversionProgress[videoToReformat]}%`}</CircularProgressLabel>
                </CircularProgress>
                <Text mt={2} fontSize="sm" color="gray.500">Converting...</Text>
              </Box>
            ) : (
              <>
                <Button variant="ghost" onClick={closeReformatDialog}>
                  Cancel
                </Button>
                <Button colorScheme="blue" onClick={handleReformat} ml={3}>
                  Convert
                </Button>
              </>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

    </Box>
  );
};

export default VideoPage;
