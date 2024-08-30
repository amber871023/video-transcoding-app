import { Box, Heading, HStack, Card, CardHeader, CardBody, Text, Icon } from '@chakra-ui/react';
import { FaPager, FaRegFileVideo, FaUserShield } from 'react-icons/fa';

const WhyChooseUsSection = () => {
  return (
    <Box mt={5} textAlign="center">
      <Heading as="h3" size="md" mb={6}>
        Why choose ViTranscoding?
      </Heading>
      <HStack
        spacing={4}
        justifyContent="center"
        flexWrap="wrap"
        gap={4}
      >
        <Card
          width={{ base: '100%', md: 'sm' }}
          minW="250px"
          flex="1"
          maxW="sm"
          boxShadow="lg"
          p={4}
        >
          <CardHeader pb={0} textAlign="center">
            <Icon as={FaPager} w={10} h={10} color="purple.600" />
          </CardHeader>
          <CardBody textAlign="center">
            <Text fontWeight="bold" mb={2}>User-Friendly Interface</Text>
            <Text>
              Our website is designed for ease of use, allowing you to convert videos quickly without technical hassles.
            </Text>
          </CardBody>
        </Card>
        <Card
          width={{ base: '100%', md: 'sm' }}
          minW="250px"
          flex="1"
          maxW="sm"
          boxShadow="lg"
          p={4}
        >
          <CardHeader pb={0} textAlign="center">
            <Icon as={FaRegFileVideo} w={10} h={10} color="purple.600" />
          </CardHeader>
          <CardBody textAlign="center">
            <Text fontWeight="bold" mb={2}>Supports Any Format</Text>
            <Text>
              We support all popular formats like MP4, FLV, MOV, AVI, WEBM and VOB, as well as many less common ones.
            </Text>
          </CardBody>
        </Card>
        <Card
          width={{ base: '100%', md: 'sm' }}
          minW="250px"
          flex="1"
          maxW="sm"
          boxShadow="lg"
          p={4}
        >
          <CardHeader pb={0} textAlign="center">
            <Icon as={FaUserShield} w={10} h={10} color="purple.600" />
          </CardHeader>
          <CardBody textAlign="center">
            <Text fontWeight="bold" mb={2}>Secure</Text>
            <Text>
              Videos are processed securely, ensuring that your data remains private and protected throughout the conversion process.
            </Text>
          </CardBody>
        </Card>
      </HStack>
    </Box>
  );
};

export default WhyChooseUsSection;
