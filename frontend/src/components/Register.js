import React, { useState } from 'react';
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Button, Input, FormControl, FormLabel, FormErrorMessage, useToast } from '@chakra-ui/react';
import axios from 'axios';

const Register = ({ isOpen, onClose, onRegisterSuccess }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSignup = async () => {
    let isValid = true;

    // Reset errors
    setEmailError('');
    setUsernameError('');
    setPasswordError('');

    // Validate email
    if (!email) {
      setEmailError('Email is required.');
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError('Email is invalid.');
      isValid = false;
    }

    // Validate username
    if (!username) {
      setUsernameError('Username is required.');
      isValid = false;
    }

    // Validate password
    if (!password) {
      setPasswordError('Password is required.');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      isValid = false;
    }

    if (!isValid) return;

    setIsLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/users/register', {
        email,
        username,
        password,
      });

      const { token } = response.data;
      localStorage.setItem('token', token);

      toast({
        title: 'Account created.',
        description: "Your account has been created and you're now logged in.",
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      onClose();
      onRegisterSuccess();

    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: error.response?.data?.msg || 'Something went wrong. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader textAlign={"center"} fontSize={"2xl"}>Sign up</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl isInvalid={!!emailError}>
            <FormLabel>Email address</FormLabel>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <FormErrorMessage>{emailError}</FormErrorMessage>
          </FormControl>
          <FormControl mt={4} isInvalid={!!usernameError}>
            <FormLabel>Username</FormLabel>
            <Input type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
            <FormErrorMessage>{usernameError}</FormErrorMessage>
          </FormControl>
          <FormControl mt={4} isInvalid={!!passwordError}>
            <FormLabel>Password</FormLabel>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <FormErrorMessage>{passwordError}</FormErrorMessage>
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button
            bg="#39349c"
            color="white"
            _hover={{ bg: "#151257" }}
            _active={{ bg: "#151257" }}
            mr={3}
            onClick={handleSignup}
            isLoading={isLoading}
          >
            Sign up
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default Register;
