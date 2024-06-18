// Instantiate router - DO NOT MODIFY
const express = require('express');
const router = express.Router();

// Import model(s)
const { Classroom, Supply, Student, StudentClassroom } = require('../db/models');
const { Op } = require('sequelize');

// List of classrooms
router.get('/', async (req, res, next) => {
    let errorResult = { errors: [], count: 0, pageCount: 0 };

    const { name, limit } = req.query;

    // Phase 6B: Classroom Search Filters
    /*
        name filter:
            If the name query parameter exists, set the name query
                filter to find a similar match to the name query parameter.
            For example, if name query parameter is 'Ms.', then the
                query should match with classrooms whose name includes 'Ms.'

        studentLimit filter:
            If the studentLimit query parameter includes a comma
                And if the studentLimit query parameter is two numbers separated
                    by a comma, set the studentLimit query filter to be between
                    the first number (min) and the second number (max)
                But if the studentLimit query parameter is NOT two integers
                    separated by a comma, or if min is greater than max, add an
                    error message of 'Student Limit should be two integers:
                    min,max' to errorResult.errors
            If the studentLimit query parameter has no commas
                And if the studentLimit query parameter is a single integer, set
                    the studentLimit query parameter to equal the number
                But if the studentLimit query parameter is NOT an integer, add
                    an error message of 'Student Limit should be a integer' to
                    errorResult.errors
    */
    const where = {};

    if (name) {
        where.name = {
            [Op.substring]: name
        }
    }

    if (limit) {
        const limits = limit.split(',');

        if (limits.length === 1) {
            if (parseInt(limits[0])) {
                where.studentLimit = parseInt(limits[0])
            } else {
                errorResult.errors.push({
                    message: 'Student Limit should be an integer'
                });
                res.status('400').json({
                    errorResult
                })
            }
        } else {
            if (limits.length !== 2) {
                errorResult.errors.push({
                    message: 'Student Limit should be two numbers: min,max'
                })
                res.status('400').json({
                    errorResult
                })
            } else if (limits[0] > limits[1]) {
                errorResult.errors.push({
                    message: 'min must be less than max'
                })
                res.status('400').json({
                    errorResult
                })
            }

            where.studentLimit = {
                    [Op.between]: [parseInt(limits[0]), parseInt(limits[1])]
                }
        }

    }


    const classrooms = await Classroom.findAll({
        attributes: [ 'id', 'name', 'studentLimit' ],
        where: {
            ...where
        },
        order: [['name', 'ASC']]
    });

    res.json(classrooms);
});

// Single classroom
router.get('/:id', async (req, res, next) => {
    let classroom = await Classroom.findByPk(req.params.id, {
        attributes: ['id', 'name', 'studentLimit'],
        // Phase 7:
            // Include classroom supplies and order supplies by category then
                // name (both in ascending order)
            // Include students of the classroom and order students by lastName
                // then firstName (both in ascending order)
                // (Optional): No need to include the StudentClassrooms
        // Your code here
        // include: {
        //     model: Student,
        //     attributes: [
        //         'id',
        //         'firstName',
        //         'lastName',
        //         'leftHanded'
        //     ],
        //     order: [['lastName', 'ASC'], ['firstName', 'ASC']],
        //     through: {
        //         model: StudentClassroom,
        //         attributes: []
        //     }
        // }


    });

    if (!classroom) {
        res.status(404);
        res.send({ message: 'Classroom Not Found' });
    }



    // Phase 5: Supply and Student counts, Overloaded classroom
        // Phase 5A: Find the number of supplies the classroom has and set it as
            // a property of supplyCount on the response
        // Phase 5B: Find the number of students in the classroom and set it as
            // a property of studentCount on the response
        // Phase 5C: Calculate if the classroom is overloaded by comparing the
            // studentLimit of the classroom to the number of students in the
            // classroom
        // Optional Phase 5D: Calculate the average grade of the classroom
    const classroomObj = classroom.toJSON();

    const sum = await StudentClassroom.sum('grade', {
        where: {
            classroomId: classroom.id
        }
    })
    
    classroomObj.supplyCount = await classroom.countSupplies();
    classroomObj.studentCount = await classroom.countStudents();
    classroomObj.overloaded = classroomObj.studentCount > classroomObj.studentLimit? true : false
    classroomObj.avgGrade = sum / classroomObj.studentCount;

    classroomObj.students = await Classroom.findByPk(req.params.id, {
        attributes: [],
        include: {
            model: Student,
            attributes: [
                'id',
                'firstName',
                'lastName',
                'leftHanded'
            ],
            order: [['lastName', 'ASC'], ['firstName', 'ASC']],
            through: {
                model: StudentClassroom,
                attributes: []
            }
        }
    })


    classroomObj.supplies = await classroom.getSupplies({
        attributes: [
            'id',
            'name',
            'category',
            'handed'
        ],
        order: [['category', 'ASC'], ['name', 'ASC']]
    })

    res.json(classroomObj);
});

// Export class - DO NOT MODIFY
module.exports = router;
