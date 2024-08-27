import React, { useState } from 'react';
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Button, Input, FormControl, FormLabel, FormErrorMessage, useToast } from '@chakra-ui/react';
import axios from 'axios';

const Login = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleLogin = async () => {
    let isValid = true;

    // Reset errors
    setEmailError('');
    setPasswordError('');

    // Validate email
    if (!email) {
      setEmailError('Email is required.');
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError('Email is invalid.');
      isValid = false;
    }

    // Validate password
    if (!password) {
      setPasswordError('Password is required.');
      isValid = false;
    }

    if (!isValid) return;

    setIsLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/users/login', {
        email,
        password,
      });

      const { token } = response.data;
      localStorage.setItem('token', token);

      toast({
        title: 'Login successful.',
        description: "You've successfully logged in.",
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      onClose();
      onSuccess();

    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: error.response?.data?.msg || 'Invalid email or password. Please try again.',
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
        <ModalHeader textAlign={"center"} fontSize={"2xl"}>Log in</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl isInvalid={!!emailError}>
            <FormLabel>Email address</FormLabel>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <FormErrorMessage>{emailError}</FormErrorMessage>
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
            onClick={handleLogin}
            isLoading={isLoading}
          >
            Log in
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default Login;
