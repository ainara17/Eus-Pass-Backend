import { User } from "../models/index.js";

/**
 * Quita la contraseña de un usuario recién creado o modificado.
 * (create y save devuelven el objeto completo, con la contraseña)
 * 
 * @param {Object} user - Instancia del modelo User devuelta.
 * @returns {Object} Objeto del usuario sin el campo password.
 */

const userWithoutPassword = (user) => {
    const {password, ...rest} = user.toJSON();
    return rest;
}

// ------------------ CRUD de usuarios ------------------

// ------------------ C (Create)---------------------------

/**
 * @typedef {Object} UserData
 * @property {string} username - Nombre del usuario
 * @property {string} email - email del usuario
 * @property {string} password - contraseña
 * @property {string} role - rol: "user" o "admin"
 */


/**
 * 
 * Crear un nuevo usuario.
 * 
 * @async
 * @param {UserData} data - Datos del usuario a crear.
 * @description Crea un nuevo usuario en la base de datos.
 * @returns {Promise<Object>} Usuario creado sin contraseña.
 * @throws {Error} Lanza excepción si ocurre un error al crear un usuario
 * 
 * @example
 * await create({ username: 'Aitor', email: 'aitor@menta.com', password: '1234', role: 'admin'});
 */


const create = async (data) => {

    const { username, email, password, role } = data;
    try{

        const user = await User.create({ username, email, password, role});
        return userWithoutPassword(user);
    }catch(error){
        console.error(error);
        throwError(error);
    }
};

// ------------------ R (Read)---------------------------
/**
 * Obtener la lista de todos los usuarios.
 * 
 * @async
 * @returns {Promise<Array<Object>>} Promesa que resuelve con un array de usuarios (sin contraseña).
 */

const getUserAll = async () => {
    try{
        const users = await User.find()
                                .select("-password")
                                .sort({ createdAt: 1 });

        return users;

    }catch(error){
        throwError(error);

    }
};


const getUserById = async (id) => {
    try{
        const user = await User.findById(id).select("-password");

        if(!user){
            throw new NotFoundError("Usuario no encontrado");
        }
        return user;

    }catch(error){
        throwError(error);        

    }
};
const getUserByUsername = async (username) => {
    try{
        const user= await User.findOne({email}).select("-password")

        if(!user){
            throw new NotFoundError("Usuario no encontrado");
        }

        return user
    }catch(error){
        console.log(error)
        throwError(error);

    }
    
};

const getUserByEmail = async (email) => {
    try{
        const user= await User.findOne({email})

        if(!user){
            throw new NotFoundError("Usuario no encontrado");
        }

        return user
    }catch(error){
        throwError(error);

    }
    
};

// ---------------- U (Update) -----------------------------------
/**
 * Reemplazar un usuario por completo.
 * 
 * @async
 * @param {number|string} id - ID del usuario a modificar.
 * @param {UserData} data - Nuevos datos completos del usuario.
 * @returns {Promise<Object|null>} Promesa que resuelve con el usuario actualizado (sin contraseña) o null si no se encuentra.
 */

const updateUser = async(id, data) => {
    try{
        const {username, email, password, role} = data;
        const user = await User.findById(id);
        if(user){
            user.username = username;
            user.email = email;
            user.password = password;
            user.role = role;
            await user.save();
            return userWithoutPassword(user);

        }else{
            throw new NotFoundError("El usuario no existe");

        }
    }catch(error){
        console.error(error);
        throwError(error);

    }
}


/**
 * Cambiar solo los campos proporcionados de un usuario.
 * La contraseña solo se cambia si llega una nueva (no vacía).
 * 
 * @async
 * @param {number|string} id - ID del usuario a modificar.
 * @param {Partial<UserData>} data - Datos parciales del usuario a actualizar.
 * @returns {Promise<Object|null>} Promesa que resuelve con el usuario modificado (sin contraseña) o null si no se encuentra.
 */

const modifyUser = async (id, data) => {
    try{
        const { username, email, avatar, interests, password, role } = data;
        const user = await User.findById(id);
        if(!user){
            throw new NotFoundError("El usuario no existe");
        }
        user.username = username ?? user.username;
        user.email = email ?? user.email;
        user.password = password || user.password;
        user.role = role ?? user.role;
        user.avatar = avatar ?? user.avatar;
        user.interests = interests ?? user.interests;

        await user.save();
        return userWithoutPassword(user);


    }catch(error){
        console.error(error);
        throwError(error);

    }
}

// ------------------------ D (Delete)------------

/**
 * Eliminar un usuario por su ID.
 * 
 * @async
 * @param {number|string} id - ID del usuario a eliminar.
 * @returns {Promise<Object|null>} Promesa que resuelve con el usuario eliminado (sin contraseña) o null si no se encuentra.
 */

const removeUser = async (id) => {
    try{
        const user = await User.findById(id);
        if(user){
            await user.deleteOne();
            return userWithoutPassword(user);
        }
        throw new NotFoundError("El usuario no existe");

    }catch(error){
        console.error(error);
        throwError(error);

    }

};

export default { 
    create, 
    getUserAll, 
    getUserById, 
    getUserByUsername,
    getUserByEmail,
    updateUser, 
    modifyUser, 
    removeUser

 };